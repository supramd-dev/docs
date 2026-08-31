---
sidebar_position: 4
id: compiling-with-hip
title: "编译构建: 添加异构 GPU/DCU 支持"
sidebar_label: "编译构建: 添加 GPU/DCU 支持"
---

import AsciinemaPlayer from '@site/src/components/AsciinemaPlayer';
import MDBuildDCU from './imgs/md-build.dcu.cast';

SupraMD 对英伟达 GPU、AMD GPU 及 DCU 等硬件的支持是通过 HIP 实现的。  
[HIP](https://github.com/ROCm-Developer-Tools/HIP) 是 AMD 推动的用于在 NVIDIA GPUs、AMD GPU 和 DCU 等硬件上进行加速计算的编程模型，其 API 也十分接近 NVIDIA CUDA，并支持将 CUDA 代码转化为 HIP 代码。
目前，HIP 支持 NVIDIA CUDA 和 [AMD ROCm](https://rocmdocs.amd.com/en/latest/index.html) 平台。
SupraMD 则是通过 HIP 来实现对多种加速硬件的计算支持。
具体有关 HIP 的安装和环境配置请参见[相关文档](https://github.com/ROCm-Developer-Tools/HIP/blob/main/INSTALL.md)。

<AsciinemaPlayer 
  src={MDBuildDCU}
  autoPlay={true} 
  loop={true} 
  rows={32} 
  theme="asciinema"
/>

## 构建前的准备
除了构建 CPU 版本所需的环境和工具外，构建支持 GPU/DCU 的 SupraMD 还需要以下环境：
1. HIP 请确保系统上安装了 HIP，且版本需要 3.5 及以上版本；并配置好了 `HIP_PATH` 环境变量（如：`export HIP_PATH=/opt/compilers/rocm/4.2.0`）。
   此外，还需要检查并确保 `hipcc` 编译器在 `PATH` 环境变量中。如果是海光DCU环境，还需要确保安装了DTK环境（以及dcc编译器）。  
2. 如果您的硬件平台是英伟达的 GPU，请确保安装且正确配置了 CUDA 并配置了 `CUDA_PATH` 环境变量（如：`export CUDA_PATH=/opt/tools/cuda/10.0`）；  
   如果硬件平台是 AMD GPU，请确保安装了 [ROCm、ROCr](https://rocmdocs.amd.com) 环境。
3. 配置`HIP_PLATFORM`环境变量: NVIDIA GPU 需要设置为 ` HIP_PLATFORM=nvidia`, AMD GPU 需设置为 `HIP_PLATFORM=amd`。
   更多请参考[相关文档](https://rocmdocs.amd.com/en/latest/Current_Release_Notes/Current-Release-Notes.html?highlight=HIP_PLATFORM#changed-environment-variables-for-hip)

注意，本章的文档只支持 EAM 势函数的的 GPU 构建。如果需要让 mtp3（mlip-3）机器学习势函数在 GPU 上运行，请参考[这里](mtp-potential)。

:::warning
目前版本的 SupraMD对GPU的支持，仅在 海光DCU 和AMG GPU上进行了验证。
目前，英伟达 GPU（CUDA环境）尚未进行验证（可以尝试用 `--preset=cuda-hipcc` 这个 CMake preset 进行编译，但可能编译会出错误）。
:::


## 构建依赖包
该步骤和 [CPU 版本中构建依赖包](./get-source-code.md#2-安装依赖)的方式一样，直接使用 `pkg install` 命令即可完成包括 `hip-potential` 在内的依赖包的构建和安装，但是 fetch 步骤需要加上 hip 这个 features。  
:::tip
如果 hip 环境不是安装在默认的 /opt/rocm 目录下，可以通过 `HIP_PATH` 环境变量来指定 hip 的安装路径。  
如果目标平台是 CUDA，可以通过 `CUDA_PATH` 环境变量来指定自定义的 CUDA 安装路径，如 `CUDA_PATH=/opt/tools/cuda/10.0`。
:::

安装依赖包的命令如下：
```bash
pkg clean --all
pkg fetch --features=hip
pkg install
```

## 构建支持 GPU/DCU 硬件的 SupraMD
进入 `supramd` 目录，然后执行以下命令以构建支持 GPU/DCU 硬件的 SupraMD。

在海光 DCU 上，需要确保存在 DTK 环境且有 dcc 编译器，然后可按如下的步骤执行：
```bash
cmake --preset=dtk-dcc
cmake --build  --preset=dtk-dcc -j 8
```

编译完成后，可在 cmake-build-gpu/bin/ 下找到可执行文件 supramd。

### 简单运行
运行需要指定 `--acc-gpu` 参数，才能使用 GPU 进行加速，否则程序将采用 CPU 进行计算。
例如：
```bash
../cmake-build-gpu/bin/supramd -c config.md.yaml --acc-gpu
```
如果，一个节点有多块 GPU，可以通过 -g 选项指定利用的GPU数量，如:
```bash
../cmake-build-gpu/bin/supramd -c config.md.yaml --acc-gpu -g 4 # 利用节点的4块 GPU。
```

更多命令可用 `supramd --help` 命令查看。
