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
说明：输出哪些热力学信息，可选的有 "step"(当前的时间步), "time"(当前的物理时间), "temp"(当前的体系温度), "pe"(当前的体系势能), "ke"(当前的体系动能), "etotal"(当前的体系的总能量,即动能、势能之和)。

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
目前 stage 中可以配置时间步、时间步长等参数以及rescale、PKA级联碰撞等操作。
 
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
设置该stage 所采用的系综(ensemble)。  

#### stage[].ensemble.type
类型：String  
说明：该 stage 所采用的系综,可以选择 `nve`, `nvt`, `npt_mttk`, 或 `none`;
其中, `none` 指, 该stage内, 不给原子施加任何作用, 原子也不会运行；`npt_mttk` 是 MTTK 方法的 NPT系综（目前NPT系综的标准模型）。

#### stage[].ensemble.nvt
设置 NVT 系综相关参数。

##### stage[].ensemble.nvt.type
- 类型：String  
- 说明：设置系综采用的算法，可选 `nose-hoover`。

##### stage[].ensemble.nvt.T_target
- 类型：Float 
- 说明：设置 NVT 控温的目标温度。

##### stage[].ensemble.nvt.type
- 类型：Float 
- 说明：nose-hoover 算法中的 τ 参数。

#### stage[].ensemble.npt_mttk
设置 MTTK 方法的 NPT 系综相关参数。当 `stage[].ensemble.type` 为 `"npt_mttk"` 时，该配置块生效。
该系综通过 Martyna-Tuckerman-Tobias-Klein 方法同时控制体系的温度和各向同性/各向异性压力。

##### stage[].ensemble.npt_mttk.tchains
- 类型：Integer  
- 说明：温度热浴的 Nosé-Hoover 链长。默认值通常为 3。链长越大，对复杂体系（如高分子、液态水）的遍历性越好，但计算开销略增。

##### stage[].ensemble.npt_mttk.pchains
- 类型：Integer  
- 说明：压力热浴的 Nosé-Hoover 链长。默认值通常为 3。控制压力耦合自由度的热浴链数目。

##### stage[].ensemble.npt_mttk.T
设置温度控制参数。温度可以在模拟过程中从 `T_begin` 线性变化到 `T_end`，若两者相等则实现恒温控制。

- T_begin：Float，模拟初始时的目标温度（单位：K）。
- T_end：Float，模拟结束时的目标温度（单位：K）。若与 `T_begin` 相同，则为恒温 NPT；不同则为变温模拟。
- T_damp：Float，温度阻尼时间参数（单位为 ps，与模拟时间单位一致）。

:::note[参数 T_damp 的设置 Tips]
参数 T_damp 对应于 Nosé-Hoover 热浴的弛豫时间常数 τ。值越小，热浴与系统耦合越强，控温越严格；过小可能导致振荡，过大则温度涨落大、平衡缓慢。一般取时间步长的几十到几百倍（例如 0.1 ps）。
:::

##### stage[].ensemble.npt_mttk.P_iso
设置各向同性压力控制参数。压力可以在模拟过程中从 `P_begin` 线性变化到 `P_end`，若两者相等则维持恒压。

- P_begin：Float，模拟初始时的目标压力（单位与模拟体系一致，为 bar）。`0.0` 表示常压（真空/无外加应力）。
- P_end：Float，模拟结束时的目标压力。若与 `P_begin` 相同则为恒压模拟。
- P_damp：Float，压力阻尼时间参数（单位与模拟时间单位一致，为 ps）。

:::note[参数 P_damp 的设置 Tips]
参数 P_damp 是气压计（barostat）的弛豫时间常数。
值越小，压力控制越紧；一般取时间步长的数百倍（例如 1.0 ps），防止与热浴耦合竞争导致不稳定。
:::

##### stage[].ensemble.npt_mttk.P_aniso
设置各向异性压力控制参数。
当体系需要独立控制 x、y、z 三个方向的压力时使用，如模拟界面、薄膜、固体相变等非对称体系。

- Px_begin, Py_begin, Pz_begin：Float，三个方向初始目标压力（单位同前）。`0.0` 表示该方向应力为零。
- Px_end, Py_end, Pz_end：Float，三个方向结束时的目标压力。可为每个方向设定相同或不同的最终值。
- Px_damp, Py_damp, Pz_damp：Float，三个方向各自的气压计阻尼时间常数（单位 ps）。通常设为相同值，如 2.0 ps，也可按各向异性需求独立调节。

:::note[参数 P_aniso 的设置 Tips]
对于 `P_aniso` 选项与 `P_iso` 互斥，只选其一）。
若启用此项，应注释掉 `P_iso`。
:::

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

### stage[].setv
说明：级联碰撞的相关参数，用于给某些原子设置速度;  

#### stage[].setv.collision_step
类型：Integer;  
说明：指定级联碰撞开始的时间步，该时间步时相对于该stage的，而非全局时间步;  

#### stage[].setv.lat
类型：Integer 数组，长度: 4;  
说明：级联碰撞PKA原子位置，数组第4项为偏移值，一般设为0;  

#### stage[].setv.energy
类型：Float  
说明：用于设置级联碰撞PKA原子能量，单位eV，直接叠加到对应原子的速度上; 

#### stage[].setv.direction
类型：Integer 数组，长度: 3;  
说明：用于设置PKA能量对应的速度在三个维度(x,y,z)的分量，或者说是PKA入射方向; 

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
