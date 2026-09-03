---
sidebar_position: 1
id: apis-intro
title: "Supra C++ API"
sidebar_label: "Supra C++ API"
---

# SupraMD C++ API

本文档提供 SupraMD（MISA-MD）的公开 C++ API，用于编写自定义的分子动力学程序：
体系初始化建模、势函数、运行（时间步循环、系综、actions）、输出（热力学统计量、轨迹 dump），以及架构支持（MPI 并行、Hash/Verlet-list 双数据结构、Host/GPU 执行器）。

API 按四个模块组织，语义与 yaml 配置文件一一对应（见 `docs/supramd-docs/docs/config/`），由**用户自己驱动时间步循环**
（多个循环对应多个 run）。

具体如下：
| 模块 | 类型 | 职责 |
| -- | -- | -- |
| **基础设施** | `super::Env` | MPI + 硬件加速环境（RAII） |
| **建模** | `super::System` | 盒子/原子创建、restart、原子数/盒子查询 |
| **势函数** | `super::System` + `super::Potential` | 势选择（惰性加载）、时间步长 |
| **运行** | `super::Runner<Executor>`、`super::Ensemble`、`super::DeformOptions` | 时间步循环、系综、actions、回调 |
| **输出** | `super::output::Thermo`、`super::output::Trajectory` | 热力学统计量（计算+打印）、轨迹 dump |

## 快速上手

```cpp
#include <md/supra_api.h>              // 唯一公共头文件（不含任何引擎头）

int main(int argc, char *argv[]) {
  super::Env env(argc, argv);          // 基础设施（RAII）

  // 建模
  super::System system(env);           // 默认 Hash；可传 super::AtomAlgorithm::VerletList
  system.createBox(super::Lattice::BCC, {20, 20, 20}, /*lattice_const=*/2.85532, /*cutoff=*/5.6);
  system.createAtoms({{"Fe", 55.845, 100}}, /*T=*/600.0, /*seed=*/466953);

  // 势函数
  system.setPotential({super::PotentialType::EamAlloy, "./example/FeCuNi.eam.alloy"});
  system.setTimeStep(0.001 /*ps*/);

  // 输出
  super::output::Trajectory traj("traj.{}.dump",
                                 super::DumpField::Position | super::DumpField::Velocity);

  const auto fields = super::ThermoField::Step | super::ThermoField::Temp |
                      super::ThermoField::Pe | super::ThermoField::Ke | super::ThermoField::Etot;

  // 运行：用户自己写时间步循环（多个循环 = 多个 run）
  super::Runner<super::Executor::Host> runner(system);
  runner.setEnsemble(super::Ensemble::NVT(600.0, 0.1));

  for (int i = 0; i < 2500; i++) { // 循环 1
    runner.step(fields);    // 一步 + 计算指定的热力学量
    if ((i + 1) % 50 == 0) {
      super::output::Thermo thermo = runner.get_thermo();
      thermo.setTarget("md.csv");               // "stdout"(默认) | "*.csv" | "*.yaml"
      thermo.log();                             // 输出一行（master rank）
    }
    if ((i + 1) % 500 == 0) traj.dump(system);  // 一帧轨迹（步号自动取当前值）
  }

  runner.setEnsemble(super::Ensemble::NPT_Iso(600.0, 0.1, 0.0, 1.0));
  runner.run(100000);       // 循环 2（便捷形式；也可 step() 无参只算受力）

  traj.finish();
  return 0;
}
```

热力学量也可以直接使用数据（不打印）：

```cpp
runner.step(super::ThermoField::Step | super::ThermoField::Temp);
const super::ThermoData &td = runner.get_thermo().data();
if (super::Env::isRoot()) {
  printf("step %lu: T = %.3f K, etotal = %.4f eV\n", td.step, td.temp, td.etotal);
}
```

完整示例仓库啊见 `apis/examples/`：
- `apis/examples/relax/`：NVE 弛豫 + 手写循环 + thermo 数据打印（最简示例）；
- `apis/examples/npt/`：NVT→NPT-Iso 两段循环 + dump + thermo csv（对齐
  `example/config.md-npt.yaml`）；
- `apis/examples/cascade/`：PKA 级联碰撞（`actions.set_v`）+ 前后 dump。

## 构建与链接

API 库随主工程一起构建（CMake target `super_api`，静态库）：

```bash
cmake -S . -B build && cmake --build build --target super_api -j
```

用户程序（示例见 `apis/examples/*/CMakeLists.txt`）：

```cmake
add_executable(my_md main.cc)
target_link_libraries(my_md PUBLIC super_api)
```

## 单位约定

长度 Å、时间 ps、能量 eV、温度 K、速度 Å/ps、压力 bar、质量 g/mol、应变率 1/ps。

## MPI 语义

SPMD 模型：所有 MPI rank 执行相同调用序列（集合调用）。其中势能 `pe`、
总能量 `etotal` 与压力 `press`/`Pxx..Pyz` 只在 master rank（rank 0）有效
（引擎内部 MPI_Reduce），其余统计量（temp/ke/volume/Lx..Lz）全 rank 一致。

## 架构支持

- **数据结构**（运行时选择，`System` 构造参数）：`AtomAlgorithm::Hash`（默认，
  KMC 兼容）/ `AtomAlgorithm::VerletList`（大体系更快）。
- **执行器**（编译期模板参数）：`super::Executor::Host`（CPU）/
  `super::Executor::GpuHip`（DCU/AMD GPU；需 HIP 加速构建 + verlet-list）。
