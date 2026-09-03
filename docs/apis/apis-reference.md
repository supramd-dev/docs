---
sidebar_position: 3
id: apis-reference
title: "Supra C++ API 参考"
sidebar_label: "Supra C++ API 参考"
---

SupraMD C++ API 的参考手册。唯一公共头文件为
`#include <md/supra_api.h>`。

所有接口均为 **MPI 集合调用**（SPMD：每个 rank 执行相同序列）。
单位约定：长度 Å、时间 ps、能量 eV、温度 K、速度 Å/ps、压力 bar、
质量 g/mol、应变率 1/ps。

## 1. 总览：四个模块

```cpp
namespace super {
  class Env;                                    // 运行环境：MPI + 架构环境
  enum class AtomAlgorithm;                     // Hash / VerletList
  enum class Executor;                          // Host / GpuHip

  // 模块 1+2：建模 + 势函数
  enum class Lattice;  struct Element;  struct BoxInfo;
  enum class PotentialType;  struct Potential;
  class System;

  // 模块 3：运行
  struct Ensemble;                              // + 静态工厂 NVE/NVT/NPT_*
  struct DeformOptions;
  template <Executor E> class Runner;

  // 模块 4：输出
  enum class ThermoField;  struct ThermoData;   // 统计量字段与数据
  enum class DumpField;  enum class DumpMode;
  namespace output { class Thermo; class Trajectory; }
}
```

## 2. super::Env — 运行环境

MPI 与硬件加速环境（RAII）：

```cpp
super::Env env(argc, argv);   // 构造即初始化（MPI + 架构环境）
...
// env 析构时自动 finalize（或显式 env.finalize()）
```

| 方法 | 说明 |
| -- | -- |
| `Env(argc, argv)` | 初始化 MPI、`MPIDomain`、硬件加速环境（如有）。 |
| `finalize()` | 结束架构环境与 MPI（幂等；析构自动调用）。 |
| `static rank()` / `size()` / `isRoot()` | 当前 rank / 进程数 / 是否 rank 0。 |


## 3. System：系统建模

### 3.1 模拟体系创建 API
```cpp
enum class Lattice { BCC, FCC, HCP };        // creation.lattice.style

struct Element {                              // creation.alloy.types[]
  std::string name;                           //   元素名，如 "Fe"
  double mass;                                //   相对原子质量 g/mol
  int weight;                                 //   权重（整数比例）
  Element(std::string name, double mass, int weight);
};

struct BoxInfo {                              // 盒子几何查询结果
  double Lx, Ly, Lz;                          //   Å
  double volume;                              //   Å³
  double lattice_const;                       //   初始晶格常数 Å
};

super::System system(env);                    // 默认 Hash 数据结构
super::System system(env, super::AtomAlgorithm::VerletList);
```

| System 方法 | 说明 |
| -- | -- |
| `createBox(lattice, box_size, lattice_const, cutoff, mpi_map={1,1,1})` | 创建模拟盒子并做 MPI 域分解。`box_size` 为各维晶格数（如 `{20,20,20}`）；`lattice_const`/`cutoff` 单位 Å；`mpi_map` 为节点内 rank 映射（对齐 cli `--map-mpi-inner-node`）。必须最先调用。 |
| `createAtoms(elements, temperature, seed, alloy_seed=1024)` | 在晶格上创建原子。初速度按温度设定（Maxwell-Boltzmann 类分布 + 动量清零 + rescale）。`elements` 至少一个。 |
| `readAtoms(file_path, init_step, elements)` | 从二进制 `.atom` 文件读入（restart，bin dump 格式）；`init_step` 为续跑起始全局步号。**仅 hash 算法**。 |
| `atomCount()` | 全体系原子数（MPI 全归约，现算）。 |
| `box()` | 当前盒子几何 `BoxInfo`。 |


### 3.2 势函数 API

```cpp
enum class PotentialType { EamAlloy, EamFs, Mlip2 };   // "eam/alloy"/"eam/fs"/"mlip2"

struct Potential {
  PotentialType type;
  std::string file_path;                       // 势文件路径（如 setfl 格式）
  Potential(PotentialType type, std::string file_path);
};

system.setPotential({super::PotentialType::EamAlloy, "./example/FeCuNi.eam.alloy"});
system.setTimeStep(0.001);                     // ps（默认 0.001）
```

- `setPotential` **惰性加载**：记录参数，首个 `step()` 时才加载势文件并做
  首次力场求解（可在首个 step 前任意时刻调用）。
- `Mlip2` 需要构建期 `MD_FEATURE_POT_MLIP2_ENABLE_FLAG`。


## 4. Runner + Ensemble：运行 API

### 4.1 Ensemble（系综，值类型 + 静态工厂）

对齐 `stages[].ensemble`：

```cpp
super::Ensemble e;
e = super::Ensemble::NVE();                          // 微正则
e = super::Ensemble::NVT(600.0, 0.1);                // NVT(T_K, tau_ps)
e = super::Ensemble::NPT_Iso(600.0, 0.1, 0.0, 1.0);  // (T, T_damp, P_bar, P_damp)
e = super::Ensemble::NPT_Aniso(600.0, 0.1, {0,0,0}, {1,1,1});
e = super::Ensemble::NPT_Xyz(600.0, 0.1, x, y, z);   // 按轴控制
```

- `NVT`：Nosé-Hoover 链（M=3），等价 LAMMPS `fix nvt`。
- `NPT_Iso`：MTK 各向同性，等价 `fix npt ... iso`。
- `NPT_Aniso`：x/y/z 独立控压，等价 `fix npt ... aniso`。
- `NPT_Xyz`：按轴控制（只控列出的轴），等价 `fix npt ... y ... z ...`。
  轴设置用 `Ensemble::Axis{P_bar, P_damp_ps}`（默认构造 = 该轴不控）。
  **单轴拉伸配合 deform 时，被拉轴不要控**（见
  [Actions 配置的典型用法](../reference/configure-terms.md)）。

### 4.2 Runner\<Executor\> 与 actions API

时间步循环对象——API 的核心：

```cpp
super::Runner<super::Executor::Host> runner(system);
// GPU 构建 + verlet-list 时：
// super::Runner<super::Executor::GpuHip> runner(system);
```

| 方法 | 说明 |
| -- | -- |
| `setEnsemble(const Ensemble&)` | 设定/切换系综，**下一步生效**（内部重建恒温器）。 |
| `step()` | 执行一个完整 MD 步；只计算受力与系综所需（如 NPT 的压力张量），不计算热力学量。 |
| `step(fields)` | 执行一个完整 MD 步，并在该步力场求解时计算指定的热力学量（OR-ed `ThermoField`）；随后可用 `get_thermo()` 获取。未请求的字段为 0。 |
| `run(nsteps)` | 便捷：连续执行 nsteps 步（无参形式，不计算热力学量）。 |
| `run(nsteps, fields)` | 便捷：连续执行 nsteps 步，每步计算指定的 fields。 |
| `get_thermo()` | 返回最近一次 `step(fields)` 的 `output::Thermo` 对象（值类型）：携带该步计算的数据，可 `log()` 打印或 `data()` 取数。有效至下一次 `step()`。 |
| `currentStep()` / `currentTime()` | 全局步号 / 物理时间 ps（含 readAtoms 起始步）。 |
| `atomCount()` / `box()` | 全体系原子数 / 盒子几何。 |
| `deleteAtomsIn(region)` | action `del_atoms`：删除笛卡尔区域 `{xlo,ylo,zlo,xhi,yhi,zhi}` Å（半开）内原子，返回删除数（全 rank 一致）。删除后下一步通信/邻居重建自动善后。 |
| `setVelocityIn(lat_region, v)` | action `velocity`：晶格区域 `{xlo,ylo,zlo,xhi,yhi,zhi}`（晶格坐标，半开）内所有原子速度**设为** `v`（Å/ps，覆盖）。 |
| `setPkaVelocity(lat, energy, dir)` | action `set_v`：晶格位置 `lat={x,y,z,sub}`（sub=0 角原子、非 0 体心）的原子（PKA）按能量 `energy`（eV）与方向 `dir`（自动归一）设速度。 |
| `deform(options)` | action `deform`：施加一次单轴拉伸（盒子长度 ×= `exp(rate·dt·every_steps)`，原子仿射重映射）。循环内周期调用实现应变率。 |
| `rescale(T)` | （弃用的）`rescale`：全部速度 rescale 到温度 T。 |
| `onStepBegin(cb)` / `onStepEnd(cb)` | 每步回调（SPMD：每个 rank 执行），签名 `void(unsigned long step)`。 |
| `finish()` | 收尾（析构自动调用）；之后不得再 `step()`。 |

### 4.3 Actions API 示例
#### DeformOptions

对齐 `actions.deform`：

```cpp
super::DeformOptions{/*axis=*/0, /*rate=*/1.0e-3, /*every_steps=*/1};
```

| 字段 | 说明 |
| -- | -- |
| `axis` | 被拉伸轴：0=x、1=y、2=z。 |
| `rate` | 工程应变率 1/ps（正=拉伸）。 |
| `every_steps` | 一次应用的等效步数（缩放因子指数）。 |

单轴拉伸典型用法（横向 NPT 控压）：

```cpp
runner.setEnsemble(super::Ensemble::NPT_Xyz(300.0, 0.1,
    {},                                        // x 被拉伸，不控
    {0.0, 1.0}, {0.0, 1.0}));                  // y/z 控 0 bar
for (int i = 0; i < 60000; i++) {
  runner.deform({0, 1.0e-3, 1});              // 每步拉一次
  runner.step();
}
```


## 5. 输出 API

### 5.1 output::Thermo：热力学统计量

一步的统计量快照，由 `Runner::get_thermo()` 返回（携带该步计算的数据），
可打印或直接取数。对齐 `output.thermo.presets`（`with` + `output_target`）：

```cpp
runner.step(super::ThermoField::Step | super::ThermoField::Temp);
super::output::Thermo thermo = runner.get_thermo();
thermo.log();                        // 打印一行（stdout，master rank）
thermo.setTarget("md.csv");          // 或 "*.csv" / "*.yaml"（每次 log() 追加一行）
thermo.log();
const super::ThermoData &td = thermo.data();   // 或直接取数据自行处理
printf("T = %f K\n", td.temp);
```

| 方法 | 说明 |
| -- | -- |
| `log()` | 把该步已计算的数据输出一行到目标（stdout 打印 / csv / yaml 追加；仅 master rank 写）。 |
| `data()` | 返回该步计算的数据（`ThermoData`；未在 `step(fields)` 请求的字段为 0）。 |
| `fields()` | 该快照对应的字段集（OR-ed `ThermoField`）。 |
| `setTarget(target)` | 设置 `log()` 输出目标：`"stdout"`（默认）或 `"*.csv"`/`"*.yaml"` 文件（每个目标一个持久输出器：表头写一次，每次 `log()` 追加一行——同一目标请用同一字段集）。 |
| `target()` | 当前输出目标。 |

对象本身是轻量值类型（可拷贝/移动），有效至下一次 `step()`。

`ThermoField`（位标志，可用 `\|` 组合，作为 `step(fields)` 的参数）：
`Step`、`Time`、`Temp`、`Volume`、`Lx`、`Ly`、`Lz`、`Press`、`Pxx`、`Pyy`、
`Pzz`、`Pxy`、`Pxz`、`Pyz`、`Pe`、`Ke`、`Etot`；
便捷值 `super::ThermoFieldAll`（全选）。
字段位值与引擎 `With*Mask` 一致；csv/yaml 列名沿用引擎（`phy_time`、`T`）。

### 5.2 ThermoData

```cpp
struct ThermoData {
  unsigned long step;      // 全局步号
  double time;             // ps
  double temp;             // K（全 rank 一致）
  double ke;               // eV（全 rank 一致）
  double pe;               // eV（仅 master 有效，其余 rank 为 0）
  double etotal;           // ke+pe，eV（仅 master）
  double volume;           // Å³
  double Lx, Ly, Lz;       // Å
  double press;            // 标量压力 bar（仅 master）
  double Pxx,Pyy,Pzz,Pxy,Pxz,Pyz;  // 压强张量分量 bar（仅 master）
};
```

### 5.3 output::Trajectory：轨迹 dump

对齐 `output.atom_dump.presets` + `stage[].dump`。构造时只指定输出参数，
首次 `dump(system)` 时绑定到体系：

```cpp
super::output::Trajectory traj("traj.{}.dump",
                               super::DumpField::Position | super::DumpField::Velocity);
...
if ((i + 1) % 100 == 0) traj.dump(system);     // 循环内输出一帧（步号自动取当前值）
```

| 构造参数 | 说明 |
| -- | -- |
| `file_path` | 输出文件名；`by_frame=true` 时可含一个 `{}` 占位符（替换为步号）。 |
| `with` | `DumpField::Position \| Velocity \| Force` 位组合（id 与 type 总是输出）。 |
| `mode` | `Binary`（二进制单文件，md-tools 转换）/ `LmpDump`（LAMMPS dump 文本，默认）/ `Direct`（调试：每 rank 每帧一文本）。 |
| `by_frame` | 每帧一文件（需 `{}`）或多帧合一文件。 |
| `region` | 可选笛卡尔区域 `{xlo,ylo,zlo,xhi,yhi,zhi}` Å（半开）；全 0（默认）= 整个体系。 |

`dump(system)` 输出该体系当前一帧（记录的步号取体系当前全局步）；首次调用时将输出器绑定到该体系。


## 6. 示例

### 6.1 弛豫 relax 示例（NVE + 手写循环 + 统计量打印）

```cpp
#include <md/supra_api.h>
#include <cstdio>

int main(int argc, char *argv[]) {
  super::Env env(argc, argv);

  super::System system(env);
  system.createBox(super::Lattice::BCC, {20, 20, 20}, 2.85532, 5.6);
  system.createAtoms({{"Fe", 55.845, 100}}, 600.0, 466953, 1024);
  system.setPotential({super::PotentialType::EamAlloy, "./example/FeCuNi.eam.alloy"});
  system.setTimeStep(0.001);

  const auto fields = super::ThermoField::Step | super::ThermoField::Temp | super::ThermoField::Pe |
                      super::ThermoField::Ke | super::ThermoField::Etot;

  super::Runner<super::Executor::Host> runner(system);
  runner.setEnsemble(super::Ensemble::NVE());

  for (int i = 0; i < 50; i++) {
    runner.step(fields);
    if ((i + 1) % 10 == 0) {
      const super::output::Thermo thermo = runner.get_thermo();
      const super::ThermoData &td = thermo.data();
      if (super::Env::isRoot()) {
        printf("step %lu: T=%.3f K, pe=%.4f eV, ke=%.4f eV\n", td.step, td.temp, td.pe, td.ke);
      }
      thermo.log();  // 或按引擎格式打印一行（stdout）
    }
  }
  runner.finish();
  return 0;
}
```

### 6.2 npt 示例（NVT→NPT 两段循环 + dump + 热力学统计量存储到csv）

见代码仓库中的 `apis/examples/npt/main.cc`（参考配置文件的 `example/config.md-npt.yaml`）：
循环 1 `NVT(600, 0.1)` 200 步 → 循环 2 `NPT_Iso(600, 0.1, 0, 1)` 200 步；
每 20 步 `step(fields)` + `get_thermo().setTarget("md.csv").log()` 写一行，
`Trajectory` 每 100 步 `dump(system)` 一帧。

### 6.3 cascade（PKA 级联碰撞）

见代码仓库中的 `apis/examples/cascade/main.cc`（参考配置文件的 `actions.set_v`）：NVE 弛豫后
`runner.setPkaVelocity({10,10,10,0}, 6.8, {1,1,1})`，前后各 dump 一帧，
跟踪 ke/pe/etotal。

## 7. `super_api` 库的编译与运行

```bash
# 方式1: 主工程构建
cmake --build build --target super_api -j
```
```cmake
# 方式2: 用户程序，采用 CMake 构建
add_executable(my_md main.cc)
target_link_libraries(my_md PUBLIC super_api)
```

运行（势文件路径为相对路径，注意工作目录）：

```bash
mpirun -np 4 ./my_md
```
