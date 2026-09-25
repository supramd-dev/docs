---
sidebar_position: 2
id: configure-terms
title: "配置项说明"
sidebar_label: "配置项说明"
---

配置文件的示例见 `$MD_PATH/example/config.md.yaml`，其中配置文件的各个字段如下，你可以根据你的需求修改各选项的值。

`$MD_PATH/example` 目录下还提供了其他几个可以直接参考的完整示例：

| 示例文件 | 说明 |
| -- | -- |
| `config.md.yaml` | 最完整的示例，包含合金创建、PKA 级联（`actions.set_v`）、多个 dump 与热力学输出预设 |
| `config.md-npt.yaml` | NVT（Nosé-Hoover）弛豫 + NPT（MTTK）控温控压 |
| `deform/config.md-npt-tension.yaml` | 单轴拉伸：`actions.deform` 沿 x 轴拉伸，NPT `P_xyz` 只对 y、z 轴控压 |
| `lj-cut/config.lj.yaml` | Lennard-Jones（`lj/cut`）势函数 + FCC 晶格，配套参数文件 `lj.pot` |

## 配置项目录

主要配置项如下：

| 配置项 | 说明 |
| -- | --|
| [simulation](#simulation) | 设置模拟原子数、晶格常数等基本属性 |
| [potential](#potential)  | 设置原子间的相互作用势函数 |
| [creation](#creation)   | 创建模拟体系的相关配置 |
| [read_phase](#read_phase) | 读取配置文件的模式创建模拟体系的相关配置 |
| [output](#output) | 轨迹文件和热力学信息输出的预设，日志输出控制 |
| [stages](#stages) | 模拟的 stages |

:::note
顶层的 `title`、`version`、`contributors` 等字段为配置文件的元信息（仅用于记录，如示例中的 `title: "SUPRAMD/MISA-MD Configure File"`），程序不会读取，可以自由填写或省略。
:::

:::warning
`simulation`、`creation`、`potential`、`output`（其中 `output.logs` 亦不可省略）这几个配置块是**必填**的；缺少其中任何一个，程序都会在读取配置时报错退出。
`read_phase` 配置块本身可以省略（省略时等价于 `read_phase.enable: false`）。
:::

## simulation
基本配置指定模拟的基本信息，如空间信息(晶格点数、截断半径等)等配置。

### simulation.phasespace
类型: Integer 数组, 长度: 3;  
说明：模拟盒子大小，分别为 x、y、z 三个维度上的尺寸；**单位为晶格常数**（即该维度上的单胞/lattice 个数，而不是长度），
实际的模拟盒子长度为 `phasespace[i] × lattice_consts_3d[i]`。  
该选项为必填项;

### simulation.lattice_const
类型: Float;  
单位: 埃, Å;  
说明: 晶格常数; 对于立方晶系（BCC、FCC）而言，即通常意义上的晶格常数 a;
该选项为必填项;  
如果 `creation.lattice.pv` 指定了原胞矢量，程序会在此基础上换算出三个方向上的实际晶格常数（见 [`creation.lattice.pv`](#creationlatticepv)）。

### simulation.cutoff_radius
类型: Float;  
单位: 埃, Å;  
说明: 截断半径，即原子间相互作用力计算时的截断距离（真实长度，而非系数）;
该选项为必填项;

:::warning
在旧版本中，该配置项名为 `cutoff_radius_factor`（截断半径系数，实际的截断半径为该系数乘以晶格常数）。
新版本中该配置项已更名为 `cutoff_radius`，其值为截断半径的**真实长度**（单位 Å），程序**不再识别** `cutoff_radius_factor`。
例如 BCC 铁（`lattice_const: 2.85532`）旧配置中的 `cutoff_radius_factor: 1.96125`，等价于新配置中的 `cutoff_radius: 5.6`。
:::

### simulation.def_timesteps_length
类型：Float;  
单位：皮秒, ps;  
默认值：0.001 ps;  
说明：模拟中默认的每一个时间步长度; stage 中未指定 `step_length` 时，将使用该值作为时间步长;  

## creation
指定模拟初始化时创建模拟体系的相关参数;

### creation.create_phase
类型：Boolean;  
默认值：true;  
说明：true表示程序初始化时，按照给定参数(如温度)随机创建原子；false表示读入已有的原子信息以创建原子;  
该选项需与 [`read_phase.enable`](#read_phaseenable) 配合使用，两者不能取相同的值;  

### creation.create_seed
类型：Integer;  
默认值：1024;  
说明：创建原子信息的随机数种子；仅 `creation.create_phase` 为 true 时有效;  

### creation.create_t_set
类型：Float;  
单位：开, K;  
说明：创建的体系的温度；仅 `creation.create_phase` 为 true 时有效，且此时为必填项;  

### creation.lattice
说明：创建原子时所使用的晶格结构的配置；仅 `creation.create_phase` 为 true 时有效，且此时为必填项;  

#### creation.lattice.style
类型：String;  
默认值：`bcc`;  
说明：晶格结构，可取 `bcc`（体心立方）、`fcc`（面心立方）或 `hcp`（密排六方）;  
程序按照该晶格结构，在 `simulation.phasespace` 指定的单胞范围内铺满原子。

:::warning
非 BCC 晶格（`fcc`、`hcp`）目前只支持 `verlet-list` 的原子/邻居搜索算法，需要在命令行中额外指定 `--algo=verlet-list`
（参见[运行 SupraMD](../run/run-md.md)）。
若使用默认的 hash 算法创建 fcc/hcp 体系，程序会在初始化阶段报错退出（`for non-BCC lattice, run md via --algo=verlet-list`）。
`example/lj-cut/config.lj.yaml` 即为 FCC 晶格的示例，运行时需要加上 `--algo=verlet-list`。
:::

#### creation.lattice.pv
类型：Float 数组的数组（至少 3 行，每行 3 个浮点数）;  
说明：原胞矢量（primitive vector），该选项是可选的，用于非立方晶系（如 HCP）下的晶格常数换算;  

程序只取第 i 个原胞矢量的第 i 个分量，即第 i 个方向上的实际晶格常数为：

```
lattice_consts_3d[i] = simulation.lattice_const × creation.lattice.pv[i][i]   (i = 0, 1, 2)
```

若不指定该选项，则三个方向上的晶格常数均等于 `simulation.lattice_const`（即默认是立方晶系）。

例如 HCP 结构（其 c/a = 1.593）可以这样配置：

```yaml
creation:
  lattice:
    style: hcp
    pv: # primitive vector
      - [1, 0, 0]
      - [0, 1.732, 0]
      - [0, 0, 1.593]
```

:::note
`pv` 中不足 3 行的配置是非法的，程序会在配置计算阶段报错退出。
:::

### creation.alloy
说明：合金元素的相关配置; 该部分为必填项（无论是否处于创建模式）;  

#### creation.alloy.create_seed
类型：Integer;  
默认值：1024;  
说明：创建原子时，随机生成不同种类合金原子的随机数种子;  

##### creation.alloy.types[]
说明：合金元素的相关类型配置，可以指定模拟体系中合金的相关名称、相对原子质量及比例;
该数组为必填项; 数组中每个元素对应模拟体系中的一种原子类型，原子类型编号（type id）按照该数组的顺序从 1 开始编号，即第一个元素对应 type 1，第二个元素对应 type 2，以此类推;

##### creation.alloy.types[].name
类型：String;  
默认值：`undefined`;  
说明：合金名称，用户自定义字符串，一般可以用化学式符号;  

##### creation.alloy.types[].mass
类型：Float;  
默认值：1.0;  
说明：合金对应元素的相对原子质量;  

##### creation.alloy.types[].weight
类型：Integer;  
默认值：1;  
说明：合金中该元素的权重，用于指定在创建体系时，随机生成的各类合金原子的比例;  

:::note
`weight` 必须是整数，各类原子的比例由 `weight` 之间的相对大小决定。
例如想要获得 Fe:Cu:Ni = 95:2:3 的比例，可以将三者的 `weight` 分别设置为 97、2、1（如示例配置）。
若某种元素的 `weight` 为 0，则该元素不会出现在创建的体系中（此时该原子类型的 `mass` 也就不起作用）。
:::

## read_phase
读取一个体系，用于初始化模拟（一般用于重启/续算，或读入由其他程序生成的原子构型）。

该配置块可以省略；如果保留该配置块，则其下的 `enable`、`version`、`file_path`、`init_step` 四个字段都必须填写。

:::warning
`read_phase.enable` 与 [`creation.create_phase`](#creationcreate_phase) 不能同时为 true，也不能同时为 false：
- `create_phase: true` + `enable: false`：按照 `creation` 中的配置创建体系（创建模式）；
- `create_phase: false` + `enable: true`：从 `read_phase.file_path` 读取体系（读取模式）。

两者之值相同（例如同为 true）时，程序会报 `ambiguous config for creating or reading system` 错误并退出。
:::

### read_phase.enable
类型：Boolean;  
说明：是否开启读取原子体系的方式，来初始化模拟。

### read_phase.version
类型：Integer;  
默认值：0;  
说明：所读取的原子体系的文件格式版本号。目前仅支持 `0`。

### read_phase.file_path
类型：String;  
说明：读取原子体系的文件路径。

### read_phase.init_step
类型：Integer;  
默认值：0;  
说明：读取原子体系后，初始的时间步。一般在 restart 模拟（或者叫从检查点开始模拟）的时候会很有用，
程序会以该时间步数作为模拟的起始时间步（同时影响热力学输出中的 `step`、`time`）。

## potential
说明：势函数文件相关参数;  

### potential.format
类型：String  
说明：势函数文件格式, 取值 `setfl` 或者 `funcfl`，目前 EAM 势函数仅支持 `setfl` 格式;
使用 Lennard-Jones 势（`potential.type` 为 `lj/cut`）时，可以填写 `lj`。  
该选项为必填项;  

:::note
程序目前仅使用 `potential.type` 来决定势函数的解析方式，`potential.format` 仅用于记录（例如输出到日志中）。
:::

### potential.type
类型：String  
说明：势函数类型, 目前支持以下取值：

| 取值 | 说明 |
| -- | -- |
| `eam/alloy` | EAM 合金势（setfl 格式） |
| `eam/fs` | EAM  Finnis-Sinclair 势（setfl 格式） |
| `mlip2` | 机器学习势 mtp3（mlip-3），需要编译时开启 MLIP-2 支持，参见 [MTP 势函数](../build/mtp-potential.md) |
| `lj/cut` | Lennard-Jones 截断势，其参数文件格式见 [Lennard-Jones 势函数参数文件](#lennard-jones-势函数参数文件) |

该选项为必填项;  

### potential.file_path
类型：String  
说明：势函数文件路径; 可以是绝对路径，也可以是相对于程序运行目录的相对路径;  
该选项为必填项;  

### Lennard-Jones 势函数参数文件
当 `potential.type` 为 `lj/cut` 时，`potential.file_path` 指向一个纯文本的 LJ 参数文件（示例如 `$MD_PATH/example/lj-cut/lj.pot`），
其格式为（各项之间以空白字符分隔，`#` 起注释作用）：

```
N                        # 原子类型数
cutoff                   # 全局截断距离，单位 Å
shift                    # 取 1 表示对势函数做平移，使得 V(cutoff) = 0；取 0 表示不平移
name1  epsilon1  sigma1  # 第 1 种原子的名称、epsilon（单位 eV）、sigma（单位 Å）
name2  epsilon2  sigma2  # 第 2 种原子
...
# 可选的交叉项，用于覆盖程序默认的 Lorentz-Berthelot 混合规则：
cross  i  j  epsilon_ij  sigma_ij
```

程序默认按照 Lorentz-Berthelot 规则生成交叉项：
`sigma_ij = (sigma_i + sigma_j) / 2`，`epsilon_ij = sqrt(epsilon_i × epsilon_j)`；
文件中给出的 `cross` 项会覆盖对应的混合结果。

:::note
`lj/cut` 势函数采用的是 metal 单位制（能量单位 eV，长度单位 Å），原子对之间的截断距离取自参数文件中的 `cutoff`。
配置项 [`simulation.cutoff_radius`](#simulationcutoff_radius) 仍然必须填写，它决定邻居列表的搜索范围；
一般将其设置为**不小于**参数文件中的 `cutoff`，否则超出邻居列表搜索范围的原子对将无法参与计算。
:::

## output
说明：输出相关配置;

### output.atom_dump
说明：输出体系原子信息（或轨迹）的相关配置;

该配置块可以省略（省略时不输出任何原子信息）。

#### output.atom_dump.presets[]
说明：预设的体系 dump 配置，包括 dump 文件名、输出模拟等配置，在 stage 中可使用这些预设的 dump 配置。

可以配置多个 presets 以供后续使用。

##### output.atom_dump.presets[].name
类型：String;  
默认值：`default`;  
说明：预设的 dump 配置的名称，在 stage 中可通过该名称使用对应的预设 dump 配置;
各个 preset 的名称应当互不相同;

##### output.atom_dump.presets[].region
类型：Float 数组，长度: 6;  
单位: 埃, Å;  
说明：输出指定区域的粒子信息，该数组指定区域的开始和结束坐标
（依次为 `[x_low, y_low, z_low, x_high, y_high, z_high]`）。 
该参数是可选的，如果不指定，则默认输出模拟体系中所有的粒子信息;

##### output.atom_dump.presets[].mode
类型：String;  
默认值：`bin`;  
说明：输出模式，取值为 `bin`、`dump` 或者其它任意值（如 `direct`、`debug`）。  
其中：
- bin 模式输出一个文件，二进制格式，依赖 md-tools 工具将二进制转化为可读的 .xyz 或 .dump 格式;  
- dump 模式直接输出可读的兼容 LAMMPS的 dump 格式;
- direct/debug 模式输出多个文本文件(每个进程与每一个需要输出的时间步都对应一个文件)，一般用于程序调试。
  该模式下文件名固定为 `dump_<进程号>_<时间步>.atom`，文件内容为原子的 id 和坐标，
  因此 **`file_path`、`by_frame`、`with` 这几个选项在该模式下均不起作用**。

:::note
程序对 `mode` 的判断方式为：字符串为 `bin` 时采用 bin 模式，为 `dump` 时采用 dump 模式，
为**其它任何值**（包括示例中曾出现过的 `copy`、`direct`、`debug` 等）时均回退为 direct/debug 模式。
:::

##### output.atom_dump.presets[].file_path
类型：String;  
默认值：`misa_mdl.out`;  
说明：bin 或者 dump 模式下，该选项是输出文件的路径;  

如果设置了按帧输出(`presets[].by_frame` 为 true), 则文件路径中需要有一个大括号(如 `md.{}.dump`),程序输出时会将大括号替换为当前时间步数。

##### output.atom_dump.presets[].by_frame
类型: Boolean;  
默认值: false;  
说明: 每隔指定的时间步数输出一次体系的粒子信息（在 stage 中配置）为一帧（frame）。
此选项适用于 bin 模式和 dump 模式。如果此按帧输出选项打开，程序会在每一帧时创建一个输出文件，否则将会将所有的帧都写入到一个文件中。


##### output.atom_dump.presets[].with
类型：String[];  
默认值：`[location]`;  
说明：设置输出文件中包含原子的哪些信息，目前支持 `location`(原子坐标)、`velocity`(原子速度)、`force`(原子受力), 其中,原子 id 和类型强制输出;  
此选项适用于 bin 模式和 dump 模式。

### output.thermo
说明：热力学信息的输出相关配置;

该配置块可以省略（省略时不输出任何热力学信息）。

:::warning
`output.thermo.interval` 配置项（v0.4.0 及更早版本中用于设置热力学输出的间隔步数）已被弃用，
如果配置文件中出现该字段，程序会报错退出。请在 `output.thermo.presets` 中定义热力学输出预设，并在 stage 中通过 `thermo_logs` 引用。
:::

#### output.thermo.presets[]
说明：热力学输出的预设，在 stage 中可使用这些预设。 
这里可以设置多个热力学输出的预设。

##### output.thermo.presets[].name
类型：String;  
默认值：`default`;  
说明：预设的名称。

##### output.thermo.presets[].output_target
类型：String;  
默认值：`default`（即输出到标准输出）;  
说明：热力学信息的输出目标（文件路径或标准输出），取值规则如下：

| 取值 | 说明 |
| -- | -- |
| `stdout` 或 `default` | 输出到标准输出（终端），与程序日志混合输出 |
| 以 `.csv` 结尾的字符串 | 输出到该名字的 CSV 文件，如 `md.csv` |
| 以 `.yml` 或 `.yaml` 结尾的字符串 | 输出到该名字的 YAML 文件，如 `md_thermo.yaml` |
| 其它任意字符串 | 回退为输出到标准输出 |

该选项是可选的，若不指定则输出到标准输出。

##### output.thermo.presets[].with
类型：String[]  
说明：输出哪些热力学信息，可选的如下：
- step: 当前的时间步；
- time: 当前的物理时间，单位：皮秒, ps；
- temp: 当前的体系温度，单位：K；
- volume: 当前的体系体积，单位： Å³；
- Lx: 当前的体系盒子在 x 方向的长度，单位： Å；
- Ly: 当前的体系盒子在 y 方向的长度，单位： Å；
- Lz: 当前的体系盒子在 z 方向的长度，单位： Å；
- press: 当前的体系的总标量压力，即平均静水压力，单位： bar；
- Pxx: 作用在垂直于X轴的平面上的X方向的压力分量（正应力分量（对角线）），单位： bar；
- Pyy: 作用在垂直于Y轴的平面上的Y方向的压力分量（正应力分量（对角线）），单位： bar；
- Pzz: 作用在垂直于Z轴的平面上的Z方向的压力分量（正应力分量（对角线）），单位： bar；
- Pxy: 作用在垂直于X轴的平面上的Y方向的压力分量（剪应力分量（非对角线）），单位：bar；
- Pxz: 作用在垂直于X轴的平面上的Z方向的压力分量（剪应力分量（非对角线）），单位：bar；
- Pyz: 作用在垂直于Y轴的平面上的Z方向的压力分量（剪应力分量（非对角线）），单位：bar；
- pe: 当前的体系势能，单位：eV；
- ke: 当前的体系动能，单位：eV；
- etotal: 当前的体系的总能量,即动能、势能之和，单位：eV。

### output.logs
说明：程序日志, 可以选择输出到标准输出或者文件; 该配置块为必填项.

#### output.logs.logs_mode
类型：String;  
默认值：`console`;  
说明：日志输出模式,可以为 `console`(输出到标准输出)或者 `file`(输出到文件).
取值不为 `console` 时，程序一律按照 `file` 模式处理.

#### output.logs.logs_filename
类型：String;  
说明：如果日志输出模式为 file, 该选项指定文件路径;
如果该选项为空字符串（或不指定），程序会自动生成一个带随机串的日志文件名（形如 `md.<随机串>.log`）.

## STAGES
stage允许一个模拟流程可以分为若干个stages，借鉴自 gitlab-ci 和 github action。每个 stage 中依据该stage的配置参数执行若干时间步。  
目前 stage 中可以配置时间步、时间步长、系综（ensemble）等参数，以及 dump、热力学输出、rescale、actions（盒子变形、删除原子、设置速度、PKA 级联碰撞等）等操作。

stages 会按照在配置文件中出现的顺序依次执行，程序总的时间步数为各个 stage 的 `steps` 之和。

### stage[].name
类型：String;  
默认值：`none`;  
说明：stage 名称，仅用于日志/输出中的标识;

### stage[].steps
类型：Integer  
说明：该 stage 执行的模拟时间步数;

### stage[].step_length
类型：Float  
单位：皮秒, ps;  
说明：该 stage 执行的模拟所使用的时间步长，如不指定则使用默认时间步长(由`simulation.def_timesteps_length`指定);

### stage[].ensemble
设置该 stage 所采用的系综（ensemble），即该 stage 内对体系温度、压力等热力学量的控制方式。
系综支持 `none`、`nve`、`nvt`、`npt_mttk` 四种类型，其中 `npt_mttk` 支持 `P_iso`（各向同性）、`P_aniso`（各向异性）、`P_xyz`（按轴）三种压力控制模式。

系综的详细配置说明，请参见[系综（Ensemble）配置项说明](./configure-ensemble.md)。

### stage[].rescale
说明：每隔一定时间步进行一次rescale，将体系温度重新设置为给定的温度; 该选项指定rescale 的相关参数;  

:::warning
该`rescale`选项目前标记为弃用。
:::

#### stage[].rescale.t
类型：Float;  
单位：开, K;  
说明：每次rescale时，重新设置的体系温度;

#### stage[].rescale.every_steps
类型：Integer  
说明：执行 rescale 操作的时间步间隔; 

### stage[].actions
说明：在该 stage 内启用的一组动作（action）。目前支持以下 action：
- `deform`：对模拟盒子沿指定轴施加单轴拉伸（变形），用于应力-应变计算；
- `del_atoms`：在指定时间步删除指定区域内的所有原子；
- `velocity`：在指定时间步将指定区域内所有原子的速度设置为给定的速度向量；
- `set_v`：在指定时间步给指定晶格位置上的原子（PKA）设置速度，用于级联碰撞。

:::note
之前的 `set_v` 配置（`set_v.collision_step`、`set_v.lat`、`set_v.energy`、`set_v.direction`）已经移动到 `stage[].actions.set_v` 下，且原来的 `collision_step` 字段更名为 `step`。
:::

actions 的详细配置说明，请参见 [Actions 配置项说明](./configure-actions.md)。

### stage[].thermo_logs
说明：热力学信息输出的相关参数配置;
需要说明的是，该配置仅针对当前的 stage 生效，即作用域仅限制在本 stage，
如果需要在其他 stage 中输出热力学信息，需要在其他 stage 中配置对应的 `thermo_logs`。

#### stage[].thermo_logs.use
类型：String;  
说明：引用的 [热力学输出 preset](#outputthermopresets) 中的名称，采用该 preset 中的配置（输出哪些热力学量等）进行热力学信息的输出;
该名称必须是 `output.thermo.presets` 中已经定义过的 `name`，否则程序在读取配置时会报错退出;

#### stage[].thermo_logs.every_steps
类型：Integer;  
说明：每间隔该项指定的时间步数，输出一次热力学信息。

### stage[].dump
说明：dump 体系粒子信息的相关参数配置; 
需要说明的是，dump 配置仅针对当前的 stage 生效，即作用域仅限制在本 stage，
如果需要在其他 stage 中输出体系粒子信息，需要在其他 stage 中配置对应的 `dump`。

#### stage[].dump.use
类型：String;  
说明：引用的 [dump preset](#outputatom_dumppresets) 中的名称，采用该 preset 中的配置（如文件名、输出区域等）进行体系粒子的输出;
该名称必须是 `output.atom_dump.presets` 中已经定义过的 `name`，否则程序在读取配置时会报错退出;

#### stage[].dump.every_steps
类型：Integer  
说明：每间隔该项指定的时间步数，输出一帧体系中的粒子信息.

:::note
多个 stage 可以引用同一个 preset，此时它们共用同一个输出实例。如果 preset 的 `by_frame` 为 false（所有帧写入同一个文件），
这些 stage 输出的帧会依次写入同一个文件（bin 模式下，文件头记录的帧数为各 stage 输出帧数之和）。
:::
