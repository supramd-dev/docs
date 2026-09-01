---
sidebar_position: 2
id: configure-terms
title: "配置项说明"
sidebar_label: "配置项说明"
---

配置文件的示例见`$MD_PATH/example/config.yaml`, 其中配置文件的各个字段如下，你可以根据你的需求修改各选项的值。

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

## simulation
基本配置指定模拟的基本信息，如空间信息(晶格点数、截断半径等)等配置。

### simulation.phasespace
类型: Integer 数组, 长度: 3;  
说明：模拟盒子大小，分别为x、y、z三个维度上的尺寸；单位为晶格常数;

### simulation.lattice_const
类型: Float;  
单位: 埃, Å;  
说明: 晶格常数;

### simulation.cutoff_radius_factor
类型: Float;  
说明: 截断半径系数; 截断半径系数乘以晶格常数等于实际的截断半径长度;

### simulation.def_timesteps_length
类型：Float;  
单位：皮秒, ps;  
说明：模拟中默认的每一个时间步长度;  

## creation
指定模拟初始化时创建模拟体系的相关参数;

### creation.create_phase
类型：Boolean;  
说明：true表示程序初始化时，按照给定参数(如温度)随机创建原子；false表示读入已有的原子信息以创建原子;  

### creation.create_seed
类型：Integer;  
说明：创建原子信息的随机数种子；仅 `creation.create_phase` 为 true 时有效;  

### creation.create_t_set
类型：Float;  
说明：创建的体系的温度；仅 `creation.create_phase` 为 true 时有效;  

### creation.alloy
说明：合金元素的相关配置; 该部分仅 `creation.create_phase` 为 true 时有效;  

#### creation.alloy.create_seed
类型：Integer;  
说明：创建原子时，随机生成不同种类合金原子的随机数种子;  

##### creation.alloy.types[]
说明：合金元素的相关类型配置，可以指定模拟体系中合金的相关名称、相对原子质量及比例;  

##### creation.alloy.types[].name
类型：String;  
说明：合金名称，用户自定义字符串，一般可以用化学式符号;  

##### creation.alloy.types[].mass
类型：Float;  
说明：合金对应元素的相对原子质量;  

##### creation.alloy.types[].weight
类型：Integer;  
说明：合金中该元素的权重，用于指定在创建体系时，随机生成的各类合金原子的比例;  

## read_phase
读取一个体系，用于初始化模拟。

### read_phase.enable
类型：Boolean;  
说明：是否开启读取原子体系的方式，来初始化模拟。

### read_phase.file_path
类型：String;  
说明：读取原子体系的文件路径。

### read_phase.init_step
类型：Integer;  
说明：读取原子体系后，初始的时间步。一般在 restart 模拟（或者叫从检查点开始模拟）的时候会很有用。

## potential
说明：势函数文件相关参数;  

### potential.format
类型：String  
说明：势函数文件格式, 取值"setfl"或者"funcfl"，目前仅支持 setfl 格式;  

### potential.type
类型：String  
说明：势函数类型, 目前支持 eam/alloy, eam/fs, mlip2;  

### potential.file_path
类型：String  
说明：势函数文件路径;  

## output
说明：输出相关配置;

### output.atom_dump
说明：输出体系原子信息（或轨迹）的相关配置;

#### output.atom_dump.presets[]
说明：预设的体系 dump 配置，包括 dump 文件名、输出模拟等配置，在 stage 中可使用这些预设的 dump 配置。

可以配置多个 presets 以供后续使用。

##### output.atom_dump.presets[].name
类型：String  
说明：预设的 dump 配置的名称，在 stage 中可通过该名称使用对应的预设 dump 配置;

##### output.atom_dump.presets[].region
类型：Float 数组，长度: 6;  
单位: 埃, Å;  
说明：输出指定区域的粒子信息，该数组指定区域的开始和结束坐标. 
该参数是可选的，如果不指定，则默认输出模拟体系中所有的粒子信息;

##### output.atom_dump.presets[].mode
说明：输出模式，取值为"bin"或者"dump"或者"direct"。  
其中：
- bin 模式输出一个文件，二进制格式，依赖 md-tools 工具将二进制转化为可读的 .xyz 或 .dump 格式;  
- dump 模式直接输出可读的兼容 LAMMPS的 dump 格式;
- direct 模式输出多个文本文件(每个进程与每一个需要输出的时间步都对应一个文件)，一般用于程序调试。

##### output.atom_dump.presets[].file_path
类型：String  
说明：bin 或者 dump 模式下，该选项是输出文件的路径;  

如果设置了按帧输出(`presets[].by_frame`为true), 则文件路径中需要有一个大括号(如`md.{}.dump`),程序输出时会将大括号替换为当前时间步数。

##### output.atom_dump.presets[].by_frame
类型: Boolean  
说明: 每隔指定的时间步数输出一次体系的粒子信息（在 stage 中配置）为一帧（frame）。
此选项适用于 bin 模式和 dump 模式。如果此按帧输出选项打开，程序会在每一帧时创建一个输出文件，否则将会将所有的帧都写入到一个文件中。


##### output.atom_dump.presets[].with
类型：String[]  
说明：设置输出文件中包含原子的哪些信息，目前支持 `location`(原子坐标)、`velocity`(原子速度)、`force`(原子受力), 其中,原子 id 和类型强制输出;  
此选项适用于 bin 模式和 dump 模式。

### output.thermo
说明：热力学信息的输出相关配置;

#### output.thermo.presets[]
说明：热力学输出的预设，在 stage 中可使用这些预设。 
这里可以设置多个热力学输出的预设。

##### output.thermo.presets[].name
类型：String  
说明：预设的名称。

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
说明：程序日志, 可以选择输出到标准输出或者文件.

#### output.logs.logs_mode
类型：String  
说明：日志输出模式,可以为`console`(输出到标准输出)或者`file`(输出到文件).

#### output.logs.logs_filename
类型：String  
说明：如果日志输出模式为file, 该选项指定文件路径.

## STAGES
stage允许一个模拟流程可以分为若干个stages，借鉴自 gitlab-ci 和 github action。每个 stage 中依据该stage的配置参数执行若干时间步。  
目前 stage 中可以配置时间步、时间步长、系综（ensemble）等参数，以及 dump、热力学输出、rescale、actions（盒子变形、删除原子、设置速度、PKA 级联碰撞等）等操作。
 
### stage[].name
类型：String  
说明：stage 名称;

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
类型：String  
说明：引用的 [热力学输出 preset](#outputthermopresets) 中的名称，采用该 preset 中的配置（输出哪些热力学量等）进行热力学信息的输出;

#### stage[].thermo_logs.every_steps
类型：Integer  
说明：每间隔该项指定的时间步数，输出一次热力学信息。

### stage[].dump
说明：dump 体系粒子信息的相关参数配置; 
需要说明的是，dump 配置仅针对当前的 stage 生效，即作用域仅限制在本 stage，
如果需要在其他 stage 中输出体系粒子信息，需要在其他 stage 中配置对应的 `dump`。

#### stage[].dump.use
类型：String  
说明：引用的 [dump preset](#outputatom_dumppresets) 中的名称，采用该 preset 中的配置（如文件名、输出区域等）进行体系粒子的输出;

#### stage[].dump.every_steps
类型：Integer  
说明：每间隔该项指定的时间步数，输出一帧体系中的粒子信息.
