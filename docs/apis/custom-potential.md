---
sidebar_position: 4
id: apis-custom-potential
title: "第三方势函数的接入"
sidebar_label: "自定义势函数"
---

SupraMD/MISA-MD 内置的势函数类型（EAM、LJ、MLIP）是固定的。
除此之外，程序支持以用户提供的源文件扩展势函数：将势函数实现编译进 MD 模拟器，并通过配置文件或 C++ API 选择，该过程无需修改代码库中的源文件。

该功能由两部分组成，可分别使用：

| 角色 | 职责 | 接口 |
| -- | -- | -- |
| 势函数开发者 | 实现势函数：读取参数，计算能量、力与维里 | `potential/custom/custom_potential_api.h` |
| 模拟使用者 | 选中并运行指定的势函数 | 配置文件 `potential.type: "custom"`，或 C++ API `super::PotentialType::Custom` |

开发者需要关心的模块/文件如下：
| 内容 | 位置 |
| -- | -- |
| 接口头文件（唯一公共头文件；其注释即该接口的参考说明） | `src/potential/custom/custom_potential_api.h` |
| 完整可运行的示例（Morse 势函数） | `src/potential/custom/sample/morse_potential.cpp` |
| 运行该示例的配置文件 | `example/custom-potential/config.morse.yaml` |
| 源文件的收集与编译规则 | `cmake/custom_potential.cmake` |

## 1. 快速上手

以随代码发布的 Morse 势示例为基础，最小工作流程如下：

```bash
# 1. 复制示例作为自己的势函数。user/ 目录已被 .gitignore 忽略，不会进入代码库历史
cp src/potential/custom/sample/morse_potential.cpp src/potential/custom/user/my_potential.cpp

# 2. 修改类名、物理模型与注册名（例如 "my/potential"）

# 3. 常规构建：user/ 目录下的源文件会被自动收集并编译进可执行文件
cmake -H. -Bbuild
cmake --build build --target supramd

# 4. 运行。原子数据结构必须为 verlet-list，见第 6 节
./build/bin/supramd --conf example/custom-potential/config.morse.yaml --algo verlet-list
```

若势函数独立于本代码库维护，可在配置阶段通过
`-DMD_CUSTOM_POTENTIAL_DIRECTORY=/path/to/my/potentials` 指定其源码目录，见第 5 节。

## 2. 势函数接口 API

### 2.1 接口构成

势函数为普通 C++ 类，包含两个成员函数与一行注册语句，不涉及基类继承与虚函数实现。其所需的引擎头
文件只有一个：

```cpp
#include <potential/custom/custom_potential_api.h> // 唯一的引擎头文件

class MyPotential {
public:
  // 仅调用一次，在模拟开始之前：读取配置文件中的参数
  void init(const potential::custom::Parameters &params);

  // 在需要势函数的每个时间步调用；计算模式展开为三个编译期模板参数
  template <bool WITH_ENERGY, bool WITH_FORCE, bool WITH_STRESS>
  void compute(const potential::custom::AtomView &atoms, const potential::custom::NeighborView &neighbors,
               double &energy, configuration::PressTensorDefaultType &virial) const;
};

REGISTER_CUSTOM_POTENTIAL("my/potential", MyPotential)
```

势函数中出现的所有类型均由该头文件引入，无需另行包含：

| 类型 | 定义位置 | 用途 |
| -- | -- | -- |
| `_type_atom_index`、`_type_atom_type`、`_type_atom_location`、`_type_atom_force`、`_type_atom_mass` 等 | `src/atom/atom_types_def.h` | 索引、原子类型、坐标、受力、质量 |
| `md::atom::Vec3<T>` | `src/atom/atom_vec.h` | 坐标与受力的数组元素类型 |
| `configuration::PressTensorDefaultType` | `src/types/press_tensor.h` | 维里累加器，即引擎自身的压力张量类型 |

上述三个头文件均为轻量头：它们只依赖 `mpi.h` 与 `comm/types_define.h`，不会引入原子容器或系统配置
等其他引擎头。`tests/unit/potential/custom_potential_api_include_test.cpp` 即以此单一头文件编译，
若该头文件不再自足，编译将直接失败。

- `init()` 是唯一读取配置的位置，每个 MPI 进程调用一次，且在第一个时间步之前；读入的参数保存在该进程
  唯一的势函数实例中。
- `compute()` 须采用上述模板签名：引擎只实例化运行模式所选中的那一份。不使用计算模式的势函数可以忽略
  这三个模板参数。
- `REGISTER_CUSTOM_POTENTIAL(name, Impl)` 须置于命名空间作用域（即定义该势函数的翻译单元中），
  `name` 即配置文件 `potential.name` 所用之名；重名注册会报错。

### 2.2 完整示例：Morse 势函数

势函数形式为 $phi(r) = D * (exp(-2*\alpha*(r - r0)) - 2*exp(-\alpha*(r - r0)))$。移除日志与注释后，其物理部分集中在 `compute()` 中的三条语句：

```cpp
#include <cmath>
#include <stdexcept>
#include <string>

#include <potential/custom/custom_potential_api.h>

namespace {

  class MorsePotential {
  public:
    void init(const potential::custom::Parameters &params) {
      // 参数缺失或类型不符均抛出异常，由引擎报告并终止运行，不作静默的默认取值
      well_depth_ = params.get<double>("well_depth"); // D, eV
      alpha_ = params.get<double>("alpha");           // 1/Angstrom
      r0_ = params.get<double>("r0");                 // Angstrom

      // 邻居表按 simulation.cutoff_radius 构建，不含更远的原子对。
      // 势函数自身的截断半径不得大于该值，否则须拒绝启动
      cutoff_ = params.getOr<double>("cutoff", params.cutoffRadius());
      if (cutoff_ > params.cutoffRadius()) {
        throw std::runtime_error("the cutoff radius of the potential (" + std::to_string(cutoff_) +
                                 ") is larger than simulation.cutoff_radius (" +
                                 std::to_string(params.cutoffRadius()) + ").");
      }
      cutoff_sq_ = cutoff_ * cutoff_;
    }

    template <bool WITH_ENERGY, bool WITH_FORCE, bool WITH_STRESS>
    void compute(const potential::custom::AtomView &atoms, const potential::custom::NeighborView &neighbors,
                 double &energy_acc, configuration::PressTensorDefaultType &virial) const {
      // 邻居表为压缩稀疏行布局：本地原子 i 的邻居为 neigh_start[i] 至 neigh_start[i + 1] - 1
      for (_type_atom_index i = 0; i < atoms.num_local; ++i) {
        for (_type_atom_index k = neighbors.neigh_start[i]; k < neighbors.neigh_start[i + 1]; ++k) {
          const _type_atom_index j = neighbors.neighbor_list[k]; // 本地原子或 ghost 原子
          const double dx = atoms.position[i].x - atoms.position[j].x; // 已取最小像
          const double dy = atoms.position[i].y - atoms.position[j].y;
          const double dz = atoms.position[i].z - atoms.position[j].z;
          const double dist2 = dx * dx + dy * dy + dz * dz;
          // 邻居表覆盖至 cutoff + skin，截断由势函数自行施加；
          // 与自身周期像构成的原子对（距离为 0）同样需要剔除
          if (dist2 >= cutoff_sq_ || dist2 <= 0.0) {
            continue;
          }
          const double r = std::sqrt(dist2);
          const double exp_term = std::exp(-alpha_ * (r - r0_));
          const double energy = well_depth_ * (exp_term * exp_term - 2.0 * exp_term);
          // 中心原子 i 所受的力为 -dphi/dr * (dx, dy, dz) / r，此处预先计算其公共因子
          const double f_over_r = 2.0 * alpha_ * well_depth_ * (exp_term * exp_term - exp_term) / r;

          if constexpr (WITH_ENERGY) {
            energy_acc += energy;
          }
          if constexpr (WITH_FORCE) {
            atoms.force[i].x += f_over_r * dx;
            atoms.force[i].y += f_over_r * dy;
            atoms.force[i].z += f_over_r * dz;
          }
          if constexpr (WITH_STRESS) {
            // 维里 f (x) r；引擎归约后除以体积得到压力
            virial.Pxx += f_over_r * dx * dx;
            virial.Pyy += f_over_r * dy * dy;
            virial.Pzz += f_over_r * dz * dz;
            virial.Pxy += f_over_r * dx * dy;
            virial.Pxz += f_over_r * dx * dz;
            virial.Pyz += f_over_r * dy * dz;
          }
        }
      }
    }

  private:
    double well_depth_ = 0.0;
    double alpha_ = 0.0;
    double r0_ = 0.0;
    double cutoff_ = 0.0;
    double cutoff_sq_ = 0.0;
  };

} // namespace

REGISTER_CUSTOM_POTENTIAL("example/morse", MorsePotential)
```

### 2.3 Parameters：参数与运行上下文

`init()` 的形参，封装配置文件 `potential` 节的内容与本次运行的上下文，为不透明类型，通过下列方法读取。

| 方法 | 说明 |
| -- | -- |
| `get<T>(key)` | 读取参数并转换为 `T`（`std::string`、`bool`、整型或浮点型）。参数缺失或类型不符时抛出 `std::runtime_error`。 |
| `getOr<T>(key, fallback)` | 参数不存在时返回 `fallback`；参数存在但读取失败时仍抛出异常。 |
| `getList<T>(key)` | 读取序列（如 `elements: [Mo, Re]`），`T` 为 `std::string`、浮点型或整型。 |
| `has(key)` | 该参数是否被设置。 |
| `name()` | 注册名，即配置文件中的 `potential.name`。 |
| `filePath()` | `potential.file_path` 的原文；未设置时为空串。 |
| `raw()` | `potential.params` 节点的原文（yaml 文本），供自行解析参数的势函数使用。 |
| `numAtomTypes()` | 原子类型数，合法的类型取值为 `[0, numAtomTypes())`。 |
| `mass(type)` | 该原子类型的相对原子质量；类型越界时返回 0。 |
| `cutoffRadius()` | 本次运行的 `simulation.cutoff_radius`，即邻居表所能覆盖的最大距离。 |
| `latticeConst(dim)` | 晶格常数，`dim` 取 0、1、2 分别对应三个方向。 |
| `rank()` / `size()` | 当前进程的 rank 与进程数。 |

说明：

- 参数键支持以点号访问嵌套映射：`get<double>("well.depth")` 读取 `well` 映射下的 `depth` 项。
- 配置文件不含 `params` 节点时，任何键均不存在（`has()` 返回 `false`）。
- `params` 为自由格式的 yaml 映射，其内容仅由势函数自身解释，引擎原样传递。`raw()` 与 `filePath()` 供需要读取自定义格式势表文件的势函数使用。

### 2.4 AtomView：原子视图

当前进程可见的原子，由若干裸数组指针构成：结构体本身不含任何成员函数，势函数直接读取其成员并自行遍历数组。前 `num_local` 个为本地原子，其受力属于本进程，可被写入；紧随其后的 `num_ghost` 个为相邻进程原子的周期像，只读，仅作为原子对的另一端。

| 字段 | 说明 |
| -- | -- |
| `num_local` | 本地原子数，类型为 `_type_atom_index`。 |
| `num_ghost` | ghost 原子数，紧随本地原子之后。 |
| `position` | `md::atom::Vec3<_type_atom_location>` 数组，长度为 `num_local + num_ghost`；原子 `i` 的坐标为 `position[i].x/.y/.z`（等价于 `position[i].data[0..2]`）。 |
| `types` | `_type_atom_type` 数组，长度为 `num_local + num_ghost`。 |
| `force` | `md::atom::Vec3<_type_atom_force>` 数组，长度为 `num_local + num_ghost`；引擎只读回前 `num_local` 个。 |

需要说明的是，三种数组均直接指向引擎原子容器中的数组，而非其副本；`position` 中 ghost 原子的坐标已位于最近周期像处，因此 `position[i] - position[j]` 即最小像位移，势函数无需另行处理周期性边界。

### 2.5 NeighborView：邻居表

邻居表采用压缩稀疏行（CSR）布局，与 `AtomView` 一样由裸数组指针构成：原子 `i` 的邻居为
`neighbor_list[neigh_start[i]]` 至 `neighbor_list[neigh_start[i + 1]] - 1`，由势函数自行遍历。

| 字段 | 说明 |
| -- | -- |
| `num_local` | 本地原子数，与 `AtomView` 中的同名成员一致。 |
| `neigh_start` | 长度为 `num_local + 1` 的行偏移数组。 |
| `neighbor_list` | 邻居的原子索引，可能指向 ghost 原子。 |

典型的遍历形式如下：

```cpp
for (_type_atom_index i = 0; i < atoms.num_local; ++i) {
  for (_type_atom_index k = neighbors.neigh_start[i]; k < neighbors.neigh_start[i + 1]; ++k) {
    const _type_atom_index j = neighbors.neighbor_list[k]; // 本地原子或 ghost 原子
    const double dx = atoms.position[i].x - atoms.position[j].x; // 已取最小像
    // ...
  }
}
```

邻居表覆盖至 `cutoff + skin`，即包含超出势函数自身截断半径的原子对；截断由势函数在内层循环中自行施加（见第 3 节），其依据为 `Parameters::cutoffRadius()` 与自身的截断半径。

### 2.6 累加器：能量与维里

`compute()` 的最后两个形参为本次调用的累加器，由引擎传入并在调用前清零，势函数将各原子对的原始值累加至其中，引擎随后读取并归约。

| 形参 | 类型 | 说明 |
| -- | -- | -- |
| `energy` | `double` | 各原子对能量之和。 |
| `virial` | `configuration::PressTensorDefaultType` | 各原子对 `f ⊗ r` 分量之和，含 `Pxx`、`Pyy`、`Pzz`、`Pxy`、`Pxz`、`Pyz` 六个分量。 |

`configuration::PressTensorDefaultType` 即 `configuration::PressTensor<double>`，与引擎自身的压力张量同类型，
其 `add()`、`scale()` 等成员函数可供势函数按需使用。两个累加器均存放未经折半的原始值，折半与 MPI 归约由引擎完成（见第 3 节）。

### 2.7 `compute()` 中的模板参数

运行模式展开为 `<bool WITH_ENERGY, bool WITH_FORCE, bool WITH_STRESS>` 三个编译期参数：受力在每一步均需计算；
能量仅在需要报告势能的步骤加入；应力仅在需要压力的步骤加入（例如 NPT 系综）。未被请求的分支不会被实例化执行，因此应统一使用 `if constexpr` 编写。

势函数须保证：无论其余两个分支是否被请求，所给出的数值均相同，且不依赖于未被给出的分支。

## 3. 计数与数值约定

能量、力与压力的数值是否正确，取决于下列约定。这些约定与内置势函数所遵循的一致。

- **每个原子对会被访问两次。** 邻居表为全表：模拟中的每一个无序对均自两端各遍历一次，即 `(i, j)` 与
  `(j, i)`（跨进程的原子对在两个进程上各出现一次）。因此势函数累加的是未经缩放的原始值——即每个原子对
  的能量与其 `f ⊗ r` 维里贡献——由引擎对本地能量与维里之和取半。相应地，`virial` 的 `Pxx` 等分量是
  对每一次访问求和，而非对每个原子对求和。
:::note
该约定后续版本可能会更改为仅访问一次原子对，届时势函数须自行折半能量与维里。
:::

- **受力不作折半。** 一个原子对的受力只累加至**中心原子** `i`，另一端由其自身的那次访问（此时它是
  `i`）或另一进程负责。换言之，**引擎不会代替势函数施加牛顿第三定律**：无论 `--no-newton` 如何设置
  （自定义势运行时会在日志中提示该设置无效），依赖引擎补足镜像受力的势函数必然是错误的。这也是受力
  在无需任何通信的情况下即完整的原因。
- **中心原子必为本地原子，邻居可能为 ghost 原子。** 外层循环的 `i` 恒为本地原子，
  `neighbors.neighbor_list[k]` 可能指向 ghost 原子。向 ghost 原子累加的受力虽会写入数组，但不会被
  引擎读回；该 ghost 原子在其所属进程上的那次访问已给出完整的受力。
- **坐标为最小像。** ghost 原子位于其最近周期像处，故 `atoms.position[i] - atoms.position[j]` 已是
  最小像位移，势函数无需了解盒子信息。
- **邻居表覆盖至 `cutoff + skin`。** 势函数须自行施加截断半径：与自身周期像构成的原子对（距离为 0）
  应剔除（对应示例中的 `dist2 <= 0.0`），超出自身截断半径的原子对同样应剔除，否则会被重复计数。
- **势函数自身的截断半径不得大于 `simulation.cutoff_radius`。** 邻居表不包含更远范围内的原子。
  `Parameters::cutoffRadius()` 给出该上限，`getOr<double>("cutoff", params.cutoffRadius())` 是常用的
  默认取值写法；需要更大截断半径的势函数应拒绝启动，而非静默遗漏原子对。
- **单位与本次运行一致**：eV、Å、ps；压力以 bar 为单位。

## 4. 使用自定义势函数

### 4.1 通过配置文件和supramd 可执行文件使用

在 `potential` 节中以 `type: "custom"` 选中第三方势函数：

```yaml
potential:
  type: "custom"        # 必填：选中第三方势函数的标志
  name: "example/morse" # 必填：势函数的注册名
  file_path: "Fe.pot"   # 可选：原样交给 init()
  format: "mypot"       # 可选：仅用于记录
  params:               # 可选：自由格式，原样交给 init()
    well_depth: 0.42
    alpha: 1.8
    r0: 2.866
    cutoff: 5.6
```

其中：
- `name` 必须为已注册的名字。配置文件解析阶段即查询注册表；名字有误时将在模拟开始前报错，并列出该
  可执行文件内置的全部第三方势函数名。
- `file_path`、`format`、`params` 均为可选项：势函数可以从 `params` 获取全部参数、读取自定义格式的
  势表文件，或不需要任何外部输入。引擎不解释这三项内容，仅负责传递。
- 对内置势函数而言，`format` 表示势表文件的读取方式；第三方势函数的文件格式由其自身定义，故该字段
  仅作记录。
- `params` 必须为映射（`key: value`），以 yaml 文本形式交给势函数，因此嵌套映射、序列与各 yaml 类型
  均可使用。

其余配置节与常规运行相同。运行时须指定 `--algo verlet-list`（见第 6 节）。
完整示例见 `example/custom-potential/config.morse.yaml`，各配置项的说明见[配置项说明](../reference/configure-terms.md#potential)。

### 4.2 通过 C++ API 使用

使用 [Supra C++ API](./apis-reference.md) 编写自定义 MD 程序时，通过 `super::PotentialType::Custom`
选中；此时 `System` 必须使用 verlet-list 数据结构：

```cpp
super::System system(env, super::AtomAlgorithm::VerletList);

// 第 2~4 个参数依次为 file_path、name、params（params 为 yaml 文本）
system.setPotential(super::Potential{super::PotentialType::Custom,
                                     /*file_path=*/"",
                                     /*name=*/"example/morse",
                                     /*params=*/"well_depth: 0.42\nalpha: 1.8\nr0: 2.866\ncutoff: 5.6"});
```

`params` 被原样交给 `init()`；空串表示无参数。名字在首次 `step()` 时（势函数为惰性加载）查询注册表，
不存在则报错退出。

### 4.3 运行中的错误对照

| 情形 | 信息 |
| -- | -- |
| `potential.type` 取值未知 | ``potential type must be one of `eam/fs`, `eam/alloy`, `mlip2`, `lj/cut` or `custom`.`` |
| `type: "custom"` 但缺少 `name` | `` `name` must be specified for a `custom` potential. `` |
| `params` 不是映射 | `` `params` of a `custom` potential must be a mapping of key/values. `` |
| 名字未注册（配置文件） | ``the potential `example/morse2` is not registered; the potentials it was built with are: example/morse.``；一个第三方势都没有时，后半句为 `this binary was built without any third-party potential.` |
| 名字未注册（C++ API，首次 `step()`） | ``no potential is registered as `example/morse2`; the potentials this binary was built with are: example/morse.`` |
| `init()` 抛出异常 | ``the potential `example/morse` cannot be initialized: <异常信息>`` |
| 参数缺失 | ``the potential `example/morse` requires the parameter `well_depth` in `potential.params` of the config file.`` |
| 使用 hash 数据结构 | ``a third-party (custom) potential is only implemented for the verlet-list atom container: run the simulation with `--algo verlet-list`.`` |

## 5. 通过 CMake 编译构建自定义势函数

势函数的源文件按下列顺序从三个目录收集：

1. `src/potential/custom/sample/*.cpp` —— 随代码发布的示例，由 `MD_CUSTOM_POTENTIAL_SAMPLE` 控制
   （默认 `ON`；用于生产环境时置为 `OFF` 可省去示例的编译时间）。
2. `src/potential/custom/user/*.cpp,*.cc` —— 与本代码库一同开发的势函数，该目录已被 git 忽略。
3. `${MD_CUSTOM_POTENTIAL_DIRECTORY}/*.cpp,*.cc` —— 在独立仓库或独立检出处中维护的势函数。

```bash
cmake -H. -Bbuild \
  -DMD_CUSTOM_POTENTIAL_DIRECTORY=/path/to/my/potentials \
  -DMD_CUSTOM_POTENTIAL_SAMPLE=OFF
cmake --build build --target supramd
```

收集到的源文件被编译进各可执行文件（`supramd`、`supra-akmc` 与测试二进制），而非编译进 `potential`库。
yaml-cpp 会被自动链接：可以势函数通过 `Parameters` 读取参数，亦可自行使用 yaml-cpp 读取自定义格式的势表文件。

### 5.1 引入势函数依赖的其它库

若势函数需要链接厂商 SDK、torch、CUDA、Fortran 运行时等外部库，将 `MD_CUSTOM_POTENTIAL_CMAKE_FILE` 选项指向一个自定义的 cmake 文件（该文件会在 `src/potential/CMakeLists.txt` 末尾被 include）：
```cmake
# my_potential.cmake
set(MD_CUSTOM_POTENTIAL_EXTRA_INCLUDE_DIRS /opt/vendor/include)
set(MD_CUSTOM_POTENTIAL_EXTRA_LIBS /opt/vendor/lib/libvendor.so)
```

```bash
cmake -H. -Bbuild -DMD_CUSTOM_POTENTIAL_CMAKE_FILE=$PWD/my_potential.cmake
```

上述两个变量会施加到每一个编入自定义势函数的可执行文件上。

## 6. 限制

- **仅支持 verlet-list 原子容器**（`--algo=verlet-list`）。接口向势函数提供一条扁平的邻居表，这正是
  verlet-list 容器的存储形式；hash 容器按格子偏移逐原子存放邻居，与接口的形态不一致，且每步重建该扁平
  表的开销将超过势函数本身的计算量，因此程序直接拒绝在此容器上运行，而非以低效方式静默执行（信息见
  4.3 节）。
- **不支持 GPU 后端**：自定义势函数仅在主机端运行，相关数据均存储于Host端，用户需要手动进行GPU设备内存的拷贝。
- 邻居表为全表，不提供半表，引擎不施加牛顿第三定律，见第 3 节。
- 势函数在每个 MPI 进程上只构造一次，`init()` 只调用一次。需要读取文件的势函数应在 `init()` 中完成，不应放在 `compute()` 中。
