---
sidebar_position: 3
id: configure-potential
title: "势函数（Potential）配置项说明"
sidebar_label: "势函数配置项说明"
---

`potential` 配置块用于设置原子间的相互作用势函数。

```yaml
potential: # potential file config
  format: "setfl"                # 势函数文件格式
  type: "eam/alloy"              # 势函数类型
  file_path: "FeCuNi.eam.alloy"  # 势函数文件路径
```

该配置块是**必填**的（缺少时程序在读取配置时报错退出）。
势表文件的准备方式参见[准备势表文件](../run/potential-file.md)。

## potential.format
类型：String  
说明：势函数文件格式, 取值 `setfl` 或者 `funcfl`，目前 EAM 势函数仅支持 `setfl` 格式;
使用 Lennard-Jones 势（`potential.type` 为 `lj/cut`）时，可以填写 `lj`。  
使用第三方势函数（`potential.type` 为 `custom`）时，该选项仅用于记录（例如输出到日志中），
自定义势表的解析方式由势函数自身决定，参见 [自定义势函数](../apis/custom-potential.md);  
除 `custom` 外，该选项为必填项;  

:::note
程序目前仅使用 `potential.type` 来决定势函数的解析方式，`potential.format` 仅用于记录（例如输出到日志中）。
:::

## potential.type
类型：String  
说明：势函数类型, 目前支持以下取值：

| 取值 | 说明 |
| -- | -- |
| `eam/alloy` | EAM 合金势（setfl 格式） |
| `eam/fs` | EAM  Finnis-Sinclair 势（setfl 格式） |
| `eam/cd` | 二元的浓度相关 EAM 势（setfl 格式 + `h(x)` 多项式），详见 [CD-EAM 势函数](#cd-eam-势函数) |
| `mlip2` | 机器学习势 mtp3（mlip-3），需要编译时开启 MLIP-2 支持，参见 [MTP 势函数](../build/mtp-potential.md) |
| `lj/cut` | Lennard-Jones 截断势，其参数文件格式见 [Lennard-Jones 势函数参数文件](#lennard-jones-势函数参数文件) |
| `custom` | 第三方（用户自定义）势函数，由编译进程序的用户源码提供，参见 [自定义势函数](../apis/custom-potential.md) |

该选项为必填项;  

## potential.file_path
类型：String  
说明：势函数文件路径; 可以是绝对路径，也可以是相对于程序运行目录的相对路径;  
当 `potential.type` 为 `custom` 时，该选项可选，其内容由势函数自行解释;  
其余取值下，该选项为必填项;  

## potential.name
类型：String  
说明：第三方势函数的注册名，即势函数源码中 `REGISTER_CUSTOM_POTENTIAL(name, Impl)` 所声明的名字，
例如 `example/morse`;  
当且仅当 `potential.type` 为 `custom` 时该选项有效，且为必填项;  
程序在解析配置文件时即核对该名字是否存在于当前可执行文件所注册的势函数列表中，不存在则报错退出;  

## potential.params
类型：Map  
说明：第三方势函数的参数，为自由格式的键值映射，程序不做任何解释，原样传递给势函数的一次性初始化
`init()`;  
当且仅当 `potential.type` 为 `custom` 时该选项有效，且为可选项;  
支持嵌套映射与列表，势函数通过点号键（如 `well.depth`）访问嵌套项; 示例：

```yaml
potential:
  type: "custom"
  name: "example/morse"
  params:
    well_depth: 0.42   # eV
    alpha: 1.8         # 1/Å
    r0: 2.866          # Å
    cutoff: 5.6        # Å，不得超过 simulation.cutoff_radius
```

各参数的取值与含义由势函数自身定义，详见 [自定义势函数](../apis/custom-potential.md);  

## Lennard-Jones 势函数参数文件
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
配置项 [`simulation.cutoff_radius`](./configure-terms.md#simulationcutoff_radius) 仍然必须填写，它决定邻居列表的搜索范围；
一般将其设置为**不小于**参数文件中的 `cutoff`，否则超出邻居列表搜索范围的原子对将无法参与计算。
:::

## CD-EAM 势函数
当 `potential.type` 为 `eam/cd` 时，程序使用二元的**浓度相关 EAM**（CD-EAM，one-site 形式，
参见 Stukowski, Sadigh, Erhart, Caro, *Modelling Simul. Mater. Sci. Eng.* **17**, 075005 (2009)）。
该势函数在普通 EAM 的基础上，把两种不同元素原子之间的相互作用按照两者的局域浓度的函数 `h(x)` 进行缩放，
适用于描述 Fe-Cr 等二元合金中随局域组态变化的相互作用。

使用 `eam/cd` 需要注意以下几点：

- `potential.format` 必须为 `setfl`；
- 势表文件是一个二元的 setfl 表（即与 `eam/alloy` 相同、含两种元素的表格），并在表之后追加注释行、`h(x)` 多项式的阶数与各阶系数（例如 Fe-Cr 势表文件 `FeCr.cdeam`，
  获取方式见 [准备势表文件](../run/potential-file.md#cd-eam-势表文件)）；
- [`creation.alloy.types`](./configure-terms.md#creationalloytypes) 必须**恰好**配置两种原子，它们与文件中的两种元素按顺序一一对应
  （第一种原子对应文件中的第一种元素，第二种原子对应第二种元素）；
- [`simulation.cutoff_radius`](./configure-terms.md#simulationcutoff_radius) 必须与势表文件中的截断距离一致，否则程序在读取势表时报错退出；

相关配置块的示例如下（其余配置块从略）：

```yaml
simulation:
  phasespace: [50, 50, 50]
  lattice_const: 2.855322
  cutoff_radius: 5.5    # 必须与势表文件中的截断距离一致
  def_timesteps_length: 0.001

potential:
  format: "setfl"
  type: "eam/cd"
  file_path: "./FeCr.cdeam"

creation:
  create_phase: true
  lattice:
    style: bcc
  alloy:
    types:              # 恰好两种原子：分别对应文件中的两种元素
      - name: Fe
        mass: 55.845
        weight: 9
      - name: Cr
        mass: 51.9961
        weight: 1
```

运行（注意 `--algo=verlet-list`）：

```bash
cd $MD_PATH/example
mpirun -n 4 ../build/bin/supramd -c config.cd.yaml --algo=verlet-list
```
