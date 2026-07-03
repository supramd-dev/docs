---
sidebar_position: 4
id: compiling-with-hip
title: "编译构建: 添加异构 GPU/DCU 支持"
sidebar_label: "编译构建: 添加 GPU/DCU 支持"
---

import AsciinemaPlayer from '@site/src/components/AsciinemaPlayer';
import MDBuildDCU from './imgs/md-build.dcu.cast';

SuperMD 对英伟达 GPU、AMD GPU 及 DCU 等硬件的支持是通过 HIP 实现的。  
[HIP](https://github.com/ROCm-Developer-Tools/HIP) 是 AMD 推动的用于在 NVIDIA GPUs、AMD GPU 和 DCU 等硬件上进行加速计算的编程模型，其 API 也十分接近 NVIDIA CUDA，并支持将 CUDA 代码转化为 HIP 代码。
目前，HIP 支持 NVIDIA CUDA 和 [AMD ROCm](https://rocmdocs.amd.com/en/latest/index.html) 平台。
SuperMD 则是通过 HIP 来实现对多种加速硬件的计算支持。
具体有关 HIP 的安装和环境配置请参见[相关文档](https://github.com/ROCm-Developer-Tools/HIP/blob/main/INSTALL.md)。
<AsciinemaPlayer
  src={MDBuildDCU}
  autoPlay={true}
  loop={true}
  rows={32}
  theme="asciinema"
/>

以下是完整的编译与运行流程说明。

## 1. 环境准备

首先在 DCU 服务器上进入 SuperMD（MISA-MD） 源码所在目录所在环境，并加载 MPI 与 DTK 工具链：

```bash
spack load mpich dtk
```

建议在构建前确认 `mpirun`、`dcc`、`cmake` 和 `pkg` 均可正常使用：

```bash
which mpirun
which dcc
dcc --version
cmake --version
pkg version
```

一个已验证的环境示例如下：

```text
$ which mpirun
/public/software/spack/spack/opt/spack/linux-x86_64_v3/mpich-4.3.2-gohdue6czlt24qkrk2v4xxvh2x3q3yqj/bin/mpirun

$ which dcc
/opt/dtk-26.04/llvm/bin/dcc

$ dcc --version
dcc version: 25.10.0-0
clang version 17.0.0
InstalledDir: /opt/dtk-26.04/llvm/bin

$ cmake --version
cmake version 3.26.5

$ pkg version
version  v0.6.4-nightly
Commit   81fba0eed2e8b4539810c4d0aac5aa46b1afb098
Build time       2026-06-20 01:32:38
```

:::info
如果 `pkg version` 能正常输出版本信息，说明 `pkg` 工具本身已经可用。后续如果在 `pkg fetch` 阶段遇到私有仓库认证或依赖拉取失败问题，请参考下面的“私有仓库认证”和“依赖仓库替换”小节。
:::

## 2. 配置私有仓库认证（可选）

如果依赖包存放在 GitLab 私有仓库中，需要先为 `pkg` 配置访问权限。

1. 登录 GitLab，在用户 **Profile** 页面进入 **Access Tokens** 子页面。
2. 新建一个 Access Token，权限只需要勾选 `read_repository`。
3. 在需要下载依赖包的 DCU 环境中，编辑或新建 `~/.pkg/pkg.config.yaml`：

```yaml
auth:
  git.hpcer.dev:
    user: your_gitlab_username
    token: your_access_token
```

保存后，再执行 `pkg fetch` 时，`pkg` 会自动使用该 Access Token 拉取私有仓库代码。

## 3. 拉取 HIP 相关依赖

进入 SuperMD 源码根目录，清理旧缓存并拉取 HIP 依赖：

```bash
cd workspace/md-tests/supermd/

pkg clean --all
pkg fetch --features=hip
```

正常情况下，最后会看到类似 `fetch succeed` 的输出。

如果由于网络或仓库访问问题导致依赖拉取失败，可以编辑源码根目录下的 `pkg.yaml`，将 `git-replace` 中的镜像替换配置取消注释。例如：

```yaml
git-replace:
  github.com/Taywee/args: gitcode.com/gh_mirrors/ar/args
  github.com/fmtlib/fmt: gitee.com/mirrors/fmt
  github.com/google/googletest: gitee.com/mirrors/googletest
  github.com/google/benchmark: gitee.com/mirrors/benchmark
  github.com/jbeder/yaml-cpp: gitee.com/mirrors/yaml-cpp
  github.com/genshen/kiwi: git.hpcer.dev/genshen/kiwi
  github.com/misa-kmc/xoshiro: git.hpcer.dev/HPCer/misa-kmc/xoshiro
  github.com/misa-md/libcomm: git.hpcer.dev/HPCer/MISA-MD/libcomm
  github.com/misa-md/potential: git.hpcer.dev/HPCer/MISA-MD/potential
  github.com/misa-md/hip-potential: git.hpcer.dev/HPCer/MISA-MD/hip-potential
```

:::tip
如果使用 `git.hpcer.dev` 上的私有镜像，请确保已经按上一节配置了 `~/.pkg/pkg.config.yaml` 中的认证信息。
:::

## 4. 安装依赖包

在 DCU 环境中，建议将 C/C++ 编译器指定为 `dcc`：

```bash
export CC=dcc CXX=dcc
```

如果是在 ROCm 环境中构建，也可以使用 `hipcc`：

```bash
export CC=hipcc CXX=hipcc
```

然后执行依赖安装：

```bash
pkg install -j 32
```

正常结束时，终端会输出类似：

```text
all packages installed successfully
```

可以通过下面的命令查看当前已经安装的依赖包：

```bash
pkg list
```

示例输出如下：

```text
git.hpcer.dev/HPCer/MISA-MD/potential@v0.4.0
github.com/Taywee/args@6.2.2
github.com/fmtlib/fmt@11.1.4
github.com/genshen/kiwi@v0.5.1
github.com/google/benchmark@v1.8.2
github.com/google/googletest@release-1.12.1
github.com/jbeder/yaml-cpp@yaml-cpp-0.7.0
github.com/misa-kmc/xoshiro@v0.2.0
github.com/misa-md/hip-potential@v0.5.1
github.com/misa-md/libcomm@v0.7.0
github.com/misa-md/potential@v0.4.0
```

## 5. 使用 CMake Preset 配置 DCU 构建

SuperMD 提供了多个 CMake 配置预设。可以先查看当前仓库支持的 preset：

```bash
cmake --list-presets
```

常见输出如下：

```text
Available configure presets:

  "host-default" - Build for Host platform using $CC and $CXX
  "dtk-dcc"      - Build for DTK platform using dcc
  "rocm-hipcc"   - Build for ROCm platform using hipcc
  "cuda-hipcc"   - Build for CUDA platform using hipcc
```

在 DCU + DTK 环境中，直接使用 `dtk-dcc` preset 进行配置：

```bash
cmake --preset=dtk-dcc
```

如果配置成功，最后会看到类似下面的输出：

```text
Configuring done
Generating done
Build files have been written to: ...
```

## 6. 编译 SuperMD

完成 CMake 配置后，执行构建命令：

```bash
cmake --build --preset=dtk-dcc -j 8 2> err.log
```

其中：

- `--preset=dtk-dcc`：使用 DCU/DTK 对应的构建预设；
- `-j 8`：使用 8 个并行任务编译，可根据服务器资源调整；
- `2> err.log`：将错误日志重定向到 `err.log`，方便排查编译问题。

编译完成后，可执行文件通常会生成在 preset 对应的构建目录中，例如：

```text
cmake-build-gpu/bin/supermd
```

## 7. 运行示例测试

进入 `example` 目录运行示例：

```bash
cd example
../cmake-build-gpu/bin/supermd -c config.md.yaml
```

:::caution
运行测试前，请确保 `example` 目录下已经放置了示例所需的 EAM 势文件，并且 `config.md.yaml` 中配置的势文件路径和文件名与实际文件一致。
:::

如果程序能够正常读取配置文件并启动计算，说明 DCU 版本的 SuperMD 已经完成编译构建。

## 8. DCU 构建命令汇总

如果环境和认证都已经配置好，DCU 平台上的完整构建流程可以简化为：

```bash
spack load mpich dtk

cd workspace/md-tests/supermd/

pkg clean --all
pkg fetch --features=hip

export CC=dcc CXX=dcc
pkg install -j 32

cmake --preset=dtk-dcc
cmake --build --preset=dtk-dcc -j 8 2> err.log

cd example
../cmake-build-gpu/bin/supermd -c config.md.yaml
```
