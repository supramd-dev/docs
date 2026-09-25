---
sidebar_position: 1
id: run-md
title: "运行  SupraMD"
sidebar_label: "运行 SupraMD"
---


我们假设你通过以上步骤已经完成了 SupraMD 的编译构建工作。
编译完成的二进制可执行文件位于 `$MD_PATH/build/bin/` 目录下（GPU/DCU 版本的构建目录为 `$MD_PATH/cmake-build-gpu/bin/`），
本节中的示例统一用 `supramd` 代指该可执行文件。

## 1.运行
你可以使用 `mpirun` 命令运行并行的 SupraMD 分子动力学软件。
例如，下面的示例中，使用4个MPI进程运行 SupraMD，并指定配置文件路径为和example同一目录下的 `config.md.yaml` 文件。

```bash
cd $MD_PATH/example
mpirun -n 4 ../build/bin/supramd -c config.md.yaml
```

:::tip
关于配置文件的相关说明请参考[配置项](../config/configure.md)等相关章节。
:::

更多信息可以通过执行 `$MD_PATH/build/bin/supramd --help` 命令查看。

## 2.命令行参数

SupraMD 的用法为：

```bash
supramd [OPTIONS]
```

各选项的含义如下（其中 `-c` / `--conf` 是唯一必须指定的选项）：

| 选项 | 说明 |
| -- | -- |
| `-h`, `--help` | 显示帮助信息 |
| `-c <config-file-path>`, `--conf=<config-file-path>` | **必填**，指定配置文件的路径 |
| `-a <algo>`, `--algo=<algo>` | 原子与邻居原子的搜索算法，取值为 `hash`（默认）或 `verlet-list`，详见 [CPU 环境](#4cpu-环境) |
| `-v`, `--version` | 显示版本信息（含是否支持 mlip2 势函数、是否支持 HIP GPU 等编译选项） |
| `--map-mpi-inner-node <x> <y> <z>` | 节点内 MPI 进程的三维映射方式，默认为 `1 1 1`，详见 [CPU 环境](#4cpu-环境) |
| `--no-newton` | 关闭牛顿第三定律（默认开启），详见 [CPU 环境](#4cpu-环境) |
| `--acc-none` | 仅使用 CPU 进行计算（即默认行为） |
| `--acc-gpu` | 使用 GPU 计算加速度（力），仅 GPU/DCU 版本可用，详见 [GPU/DCU 环境](#5gpudcu-环境) |
| `--acc-nei` | 在 GPU 上构建邻居列表（verlet-list），需要同时指定 `--acc-gpu` |
| `-b <n>` | GPU 计算时的分批（batch）数量，默认为 1 |
| `-g <n>`, `--gpus_per_node=<n>` | 每个节点使用的 GPU 数量，默认为 1 |

:::note
在 GPU/DCU 版本的构建中，除了 `--acc-none` 之外，还额外提供了 `--acc-gpu`；
`-b`、`-g`、`--acc-nei` 三个选项也只在 GPU/DCU 版本中可用。
:::

:::tip
`--help` 的输出示例（不同构建版本会略有差异，以实际的 `--help` 输出为准）：

```bash
$ build/bin/supramd --help
  build/bin/supramd {OPTIONS}

    This is SupraMD program.

  OPTIONS:

      -h, --help                        Display this help menu
      -c[conf], --conf=[conf]           The configure file
      -a[algo], --algo=[algo]           The algorithm used for atom and neighbor
                                        atom searching. It can be hash (default)
                                        or verlet-list.
      -v, --version                     show version number
      --map-mpi-inner-node=[map]        inner-node MPI rank mapping (x y z)
      --no-newton                       does not apply Newton's 3rd law

    accelerator (choose at most one):
      --acc-none                        use CPU only
      --acc-gpu                         use GPU for computing acceleration

      -b[batches], --Batches number[batches]
                                        batches
      -g[gpus_per_node], --gpus_per_node=[gpus_per_node]
                                        specify how many gpus used in one node
      --acc-nei                         Building neighbor list of verlet-list on GPUs

    authors:BaiHe.
```
:::

## 3.运行结果

运行完成后，example目录下会多出一个名为misa_md.\*.out 的二进制文件(misa_md.\*.out为默认的输出文件名称，可在配置文件中更改)。
该文件中包含各个指定时间步dump的所有原子信息，如原子类型、id、位置坐标、速度等。

需要注意的是，如果采用的是 `bin` 的输出模式，该文件是二进制文件，无法直接查看，需要转化为可方便查看的文本文件。  
可以使用`md-tools` 转化工具将二进制文件转化为文本文件md.txt ：
```bash
md-tools -f text -r 4 -i ./misa_md.origin.out -o md.txt
```

更多关于`md-tools`工具的信息及使用方法请参照**[md-tools 工具](md-tools.md)**章节。

## 4.CPU 环境

不指定任何 `acc-*` 选项时，程序默认使用 CPU 进行计算，此时：

- `--acc-none` 是默认行为的显式写法，可以省略，一般用于脚本中显式声明"只使用 CPU"；
- 程序为纯 MPI 并行，使用 `mpirun -n <进程数>` 指定并行度。

### --algo：原子与邻居原子的搜索算法
该选项决定程序使用哪种原子/邻居数据结构，取值为 `hash`（默认）或 `verlet-list`：

| 取值 | 说明 |
| -- | -- |
| `hash` | 基于哈希的邻居索引（BCC 晶格专用），内存开销小，一般速度更快 |
| `verlet-list` | 基于邻居列表（verlet list），支持 BCC、FCC、HCP 等晶格 |

:::warning
非 BCC 晶格（`creation.lattice.style` 为 `fcc` 或 `hcp`）**必须**使用 verlet-list 算法，
否则程序会在初始化阶段报错退出。例如运行 FCC 晶格的 LJ 示例：

```bash
cd $MD_PATH/example/lj-cut
mpirun -n 4 ../../build/bin/supramd -c config.lj.yaml --algo=verlet-list
```
:::

### --map-mpi-inner-node：节点内 MPI 进程的映射
当在多个节点上运行、且每个节点上有多个 MPI 进程时，程序需要知道节点内进程的三维排布方式，
以便让通信量大的相邻子区域尽量落在同一个节点内。

该选项接受 3 个正整数 `x y z`，其乘积一般应当等于每个节点上的进程数，默认为 `1 1 1`。
例如在一个 8 进程/节点的场景下，可以设置为 `2 2 2`：

```bash
mpirun -n 8 supramd -c config.md.yaml --map-mpi-inner-node 2 2 2
```

### --no-newton：关闭牛顿第三定律
默认情况下（不指定该选项），程序利用牛顿第三定律，两个原子之间的相互作用只计算一次、并同时施加在两者上，
从而节省约一半的相互作用计算量。

指定 `--no-newton` 后，每一对原子的相互作用在两个方向上分别独立计算、不再复用。
这会增加计算量，一般只在调试、对比或者势函数实现有特殊要求时使用。

## 5.GPU/DCU 环境

关于如何编译出支持 GPU/DCU 的 SupraMD，请参见[编译构建: 添加异构 GPU/DCU 支持](../build/compiling-with-hip.md)。

### --acc-gpu：使用 GPU 加速
GPU/DCU 版本的程序**不会**自动使用 GPU，必须显式指定 `--acc-gpu`，否则程序将退回纯 CPU 计算：

```bash
cd $MD_PATH/example
mpirun -n 4 ../cmake-build-gpu/bin/supramd -c config.md.yaml --acc-gpu
```

:::note
GPU 加速目前针对 EAM（`eam/alloy`、`eam/fs`）势函数实现；mlip2（mtp3）机器学习势函数的 GPU 支持请参见
[MTP 势函数](../build/mtp-potential.md)。
`lj/cut` 势函数目前没有 GPU 实现，即使指定了 `--acc-gpu`，其计算仍会在 CPU 上进行。
:::

### -g / --gpus_per_node：节点内使用的 GPU 数量
该选项指定每个节点上使用的 GPU 数量，默认为 `1`。
程序按照节点内的 MPI 进程编号，以取模的方式为每个进程分配设备：

```
使用的设备编号 = 节点内进程编号 % gpus_per_node
```

因此，如果一个节点上有 4 块 GPU、并在该节点上启动 4 个 MPI 进程，则应当设置为 4，这样每个进程恰好独占一块 GPU：

```bash
# 每个节点 4 个 MPI 进程，每个进程使用 1 块 GPU
mpirun -n 4 supramd -c config.md.yaml --acc-gpu -g 4
```

如果节点内的进程数多于 GPU 数（例如 8 个进程只指定 `-g 4`），则相邻的两个进程会共享同一块 GPU。

### --acc-nei：在 GPU 上构建邻居列表
指定该选项后，邻居列表（verlet-list）的构建也放到 GPU 上进行；不指定时，邻居列表在 CPU 上构建，
只有受力计算使用 GPU。

该选项必须与 `--acc-gpu` 一起使用，否则程序会报错退出：
`--acc-nei is specified but no --acc-gpu flag specified`。

:::note
`--acc-nei` 只对 verlet-list 数据结构有效，即需要配合 `--algo=verlet-list` 使用（默认为 `hash` 数据结构时不构建邻居列表）。
:::

```bash
mpirun -n 4 supramd -c config.md.yaml --acc-gpu --acc-nei --algo=verlet-list
```

### -b：GPU 计算的分批数量
该选项设置 GPU 计算时所采用的分批（batch）数量，默认为 `1`。
分批数量决定了计算与通信重叠（double buffer）时每批处理的数据量，属于性能调优参数。

:::warning
如果 GPU 版本在编译时开启了牛顿第三定律（cmake 选项 `MD_USE_NEWTONS_THIRD_LAW_FLAG`，默认为 `OFF`），
则 `-b` 只能取默认值 1；取其它值程序会报错退出：
`Currently, batch number which is larger than 1 is not supported if newton's third law is enabled.`
:::

:::note
该选项目前只注册了短选项 `-b`，`--help` 中显示的长选项形式（`--Batches number`）带有空格，无法正常使用，请使用 `-b`。
:::

:::note
目前， `-b` 选项只对 EAM 势函数有效，mlip2（mtp3）势函数的 GPU 支持请参见 [MTP 势函数](../build/mtp-potential.md)。
:::

### GPU 环境变量
除命令行选项外，GPU/DCU 环境通常还需要注意以下环境变量：

- 编译阶段需要 `HIP_PATH`（以及 CUDA 平台下的 `CUDA_PATH`）指向 HIP / CUDA 的安装位置，详见[编译构建: 添加异构 GPU/DCU 支持](../build/compiling-with-hip.md)；
- 运行阶段可以通过 `HIP_VISIBLE_DEVICES`（或 `ROCR_VISIBLE_DEVICES`）等变量限制程序可见的设备，
  以便在同一节点上让不同的作业分别使用不同的 GPU；
- 运行命令（如 `mpirun`）需要能够通过 slurm、`srun` 等方式把进程正确绑定到带 GPU 的节点上。
