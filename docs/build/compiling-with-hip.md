---
sidebar_position: 4
id: compiling-with-hip
title: "编译构建: 添加异构 GPU/DCU 支持"
sidebar_label: "编译构建: 添加 GPU/DCU 支持"
---
import AsciinemaPlayer from '@site/src/components/AsciinemaPlayer';
import MDBuildDCU from './imgs/md-build.dcu.cast';

SuperMD 通过 HIP 及相关工具链支持 NVIDIA GPU、AMD GPU 和国产 DCU 等异构硬件。  
在海光 DCU 平台上，可以使用 DTK 提供的 `dcc` 编译器完成依赖安装和项目构建。

本文以 **DCU + DTK** 环境为例，介绍依赖获取、CMake 配置、编译和运行流程。

<AsciinemaPlayer
  src={MDBuildDCU}
  autoPlay={true}
  loop={true}
  rows={32}
  theme="asciinema"
/>

## 1. 准备构建环境

不同服务器可能通过环境模块、Spack、容器或系统预安装等方式提供编译环境。本文不限定具体的环境加载方式，请根据所在平台完成 MPI、DTK、CMake 和 `pkg` 的安装或加载，并确保相关命令位于 `PATH` 中。

下面是当前已验证的工具版本组合。它们表示已完成测试的环境，并不代表项目支持的最低版本。

| 工具 | 用途 | 已验证版本 |
| --- | --- | --- |
| MPICH / `mpirun` | MPI 并行运行环境 | MPICH 4.3.2 |
| DTK / `dcc` | DCU 平台 C/C++ 与 HIP 编译工具链 | DTK 26.04，`dcc` 25.10.0-0 |
| CMake | 项目配置与构建 | 3.26.5 |
| `pkg` | 项目依赖获取与安装 | v0.6.4-nightly，commit `81fba0eed2e8b4539810c4d0aac5aa46b1afb098` |

构建前可使用以下命令确认工具是否可用：

```bash
which mpirun
which dcc

dcc --version
cmake --version
pkg version
```

只要上述命令能够正常找到程序并输出版本信息，即可继续后续步骤。

## 2. 获取 HIP 相关依赖

进入 SuperMD 源码根目录：

```bash
cd /path/to/supermd
```

清理旧缓存，并拉取启用 HIP 特性所需的依赖：

```bash
pkg clean --all
pkg fetch --features=hip
```

依赖拉取成功后，终端会输出类似 `fetch succeed` 的提示。

:::info
如果 `pkg version` 能正常输出版本信息，说明 `pkg` 工具本身已经可用。后续如果在 `pkg fetch` 阶段遇到私有仓库认证或依赖拉取失败问题，请参考下面的“私有仓库认证”和“依赖仓库替换”小节。
:::


### 2.1 配置私有仓库认证（可选）

如果 `pkg fetch` 需要访问 GitLab 私有仓库，例如 `git.hpcer.dev`，请先配置只读访问令牌。

1. 在 GitLab 用户页面进入 **Access Tokens**。
2. 新建 Access Token，并勾选 `read_repository` 权限。
3. 编辑或新建 `~/.pkg/pkg.config.yaml`：

```yaml
auth:
  git.hpcer.dev:
    user: your_gitlab_username
    token: your_access_token
```

保存后重新执行：

```bash
pkg fetch --features=hip
```


### 2.2 使用依赖仓库替换配置（可选）

如果访问 GitHub 较慢或依赖拉取失败，可以检查项目根目录中的 `pkg.yaml`，并按当前部署环境取消 `git-replace` 下已有镜像配置的注释。

例如：

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

如果替换后的地址指向私有仓库，还需要同时完成上一节中的认证配置。

## 3. 安装依赖

在 DCU + DTK 环境中，将 C 和 C++ 编译器设置为 `dcc`：

```bash
export CC=dcc
export CXX=dcc
```

然后安装依赖：

```bash
pkg install -j 32
```

`-j 32` 表示最多使用 32 个并行任务，可根据服务器资源调整。安装成功后会看到类似下面的输出：

```text
all packages installed successfully
```

## 4. 使用 CMake Presets 配置项目

[CMake Presets](https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html) 是 CMake 提供的标准配置机制。项目可以在 `CMakePresets.json` 中预先保存生成器、编译器、构建目录和缓存变量等配置，用户通过 preset 名称即可复用这些参数，而不需要每次手动输入完整的 CMake 命令。

在源码根目录执行：

```bash
cmake --list-presets
```

该命令会读取项目中的 CMake preset 配置，并列出可用的 **configure presets**。当前项目通常包含以下预设：

| Preset | 目标平台 | 编译器 |
| --- | --- | --- |
| `host-default` | CPU / Host | 使用环境变量中的 `$CC` 和 `$CXX` |
| `dtk-dcc` | 海光 DCU / DTK | `dcc` |
| `rocm-hipcc` | AMD GPU / ROCm | `hipcc` |
| `cuda-hipcc` | NVIDIA GPU / CUDA | `hipcc` |

在 DCU 平台上，使用 `dtk-dcc` preset 完成配置：

```bash
cmake --preset=dtk-dcc
```

该命令会使用 `dtk-dcc` 中预定义的编译器、构建目录和相关 CMake 参数。配置成功后会看到类似以下输出：

```text
Configuring done
Generating done
Build files have been written to: ...
```

:::tip
`cmake --list-presets` 默认列出配置阶段使用的 preset。需要查看构建阶段的 preset 时，可以执行 `cmake --list-presets=build`。
:::

## 5. 编译 SuperMD

完成配置后，使用对应的 build preset 编译项目：

```bash
cmake --build --preset=dtk-dcc -j 8 2> err.log
```

参数说明：

- `--preset=dtk-dcc`：使用项目中定义的 DCU/DTK 构建预设；
- `-j 8`：使用 8 个并行任务，可根据服务器资源调整；
- `2> err.log`：将标准错误输出保存到 `err.log`，便于排查编译问题。

编译完成后，可执行文件通常位于 preset 指定的构建目录中，例如：

```text
cmake-build-gpu/bin/supermd
```

## 6. 运行示例

进入 `example` 目录：

```bash
cd example
```

运行前，请确保示例所需的 EAM 势文件已经放置在正确位置，并且 `config.md.yaml` 中配置的文件路径与实际文件一致。

运行时需要显式指定计算后端：

| 运行方式 | 命令行选项 | 说明 |
| --- | --- | --- |
| DCU / GPU 加速 | `--acc-gpu` | 启用 GPU/DCU 异构加速 |
| CPU | `--acc-none` | 不启用异构加速，使用 CPU 运行 |

在 DCU 上运行：

```bash
../cmake-build-gpu/bin/supermd -c config.md.yaml --acc-gpu
```

使用 CPU 运行：

```bash
../cmake-build-gpu/bin/supermd -c config.md.yaml --acc-none
```

如果程序能够正常读取配置文件、加载势函数并开始计算，说明 SuperMD 已成功完成构建。

## 7. DCU 构建命令汇总

在 MPI、DTK、CMake、`pkg` 和私有仓库认证均已配置完成的情况下，DCU 平台的主要命令如下：

```bash
cd /path/to/supermd

pkg clean --all
pkg fetch --features=hip

export CC=dcc
export CXX=dcc
pkg install -j 32

cmake --list-presets
cmake --preset=dtk-dcc
cmake --build --preset=dtk-dcc -j 8 2> err.log

cd example
../cmake-build-gpu/bin/supermd -c config.md.yaml --acc-gpu
```