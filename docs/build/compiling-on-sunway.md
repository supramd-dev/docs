---
sidebar_position: 5
id: compiling-with-sunway
title: "编译构建: 添加 sunway 异构支持"
sidebar_label: "编译构建: 添加 sunway 支持"
---


## 准备额外的源码
为了支持在神威上运行 SupraMD，在开始构建之前，除了 CPU 版本所需的依赖包外，还需要获取几个额外的源码包： 
- SupraMD-sunway: https://git.hpcer.dev/HPCer/SupraMD/SupraMD-sunway ，SupraMD 核心计算模块的在神威平台上的实现。

目录结构如下：
```bash
workspace
  |-- SupraMD # MISA MD source for CPU
  |-- misa-md-sunway
```

## 构建前的准备
除了构建 CPU 版本所需的环境和工具外，构建支持神威从核的 SupraMD 还需要以下环境：
1. 要求编译器支持 C++11。在太湖之光上，可以用 sw5gcc/sw5g++ (基于gcc 5.3 开发)或者 mpiswgcc/mpiswg++。  

:::tip
太湖之光上设置基于gcc 5.3 的编译器 sw5gcc/sw5g++ 的命令为:
```bash
source /usr/sw-mpp/swcc/swgcc530-tools/setenv-release
```
:::

## 构建依赖包
该步骤和 [CPU 版本中构建依赖包](./get-source-code.md#2-安装依赖)的方式一样，直接使用 `pkg install` 命令即可完成包括 `hip-potential` 在内的依赖包的构建和安装。  
```bash
export CC=/usr/sw-mpp/mpi2/mpiswgcc/bin/mpiswgcc
export CXX=/usr/sw-mpp/mpi2/mpiswgcc/bin/mpiswg++
pkg fetch
pkg install --sh
```

## 构建支持 sunway 从核的 SupraMD
进入 `super` 目录，然后执行以下命令以构建支持 GPU/DCU 硬件的 SupraMD。

```bash
# in M directory
cmake -B./cmake-build-sunway/ -S./ \
   -DCMAKE_BUILD_TYPE=Release \
   -DMD_SUNWAY_ARCH_ENABLE_FLAG=ON \
   -DMD_SUNWAY_ARCH_SRC_PATH=../misa-md-sunway \
   -DCMAKE_CXX_FLAGS="-std=c++11" \
   -DCMAKE_TOOLCHAIN_FILE="cmake/toolchain/sunway-taihulight/toolchain-mpi.cmake"
cmake --build ./cmake-build-sunway/ -j 4
```

其中在 cmake 配置过程中，`MD_SUNWAY_ARCH_ENABLE_FLAG` 参数表示启用 sunway 环境的支持， `MD_SUNWAY_ARCH_SRC_PATH` 参数指定了 `misa-md-sunway` 包的源码目录。 
:::note
在早前的版本中，这两个参数可能为 `SUNWAY_ARCH_ENABLE_FLAG` 与 `SUNWAY_ARCH_SRC_PATH`.
:::
此外，我们还指定了在 `CMAKE_TOOLCHAIN_FILE` 中指定了工具链，如编译器路径、链接参数等。

:::tip
如果你需要生成优化版本的可执行文件，可以在 cmake 配置命令中加上 `-DCMAKE_BUILD_TYPE=Release` 选项，
这样 cmake 在调用编译器进行编译和链接时就会使用优化选项（如 `-O3` 选项）。
:::
编译完成后，即可在 SupraMD 的 `cmake-build-sunway/bin` 目录找到支持在 sunway 从核加速硬件上运行的 msiamd 可执行文件。
