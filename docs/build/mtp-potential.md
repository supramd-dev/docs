---
sidebar_position: 7
id: mtp-potential
title: MTP 机器学习势函数集成
sidebar_label: MTP 势函数
---
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

[mlip-3](https://gitlab.com/ashapeev/mlip-3) 是一种基于机器学习方法的势函数，其基于 moment tensor potentials (MTPs) 方法，详细信息可以在[此处](https://mlip.skoltech.ru)或者 [mlip-3 的代码仓库](https://gitlab.com/ashapeev/mlip-3) 获取。


## mlip-3 与 SupraMD 的集成
现在，SupraMD 已经支持了 MLIP-3 势函数（注：mlip-3 是 MTP 势的一种实现）。
此外，我们对其进行了 GPU 性能优化，仓库见：https://git.hpcer.dev/HPCer/MISA-MD/mtp3（目前是 v0.2.0 版本）。

### 安装 mlip-3 依赖
在开始之前，请先按照 mlip-3 的支持文档，相关的编译器等环境在检查您的系统里面是否都已经被安装了。
除了 SupraMD 所需要的 MPI、CMake、C++/C 编译器外，mlip-3 还需要 Fortran 编译器。

可以执行以下命令获取和编译 mlip-3 依赖：
```bash
pkg clean --all
pkg fetch --features=mtp
pkg install
```
以上命令会启用 pkg.yaml 中指定的 git.hpcer.dev/HPCer/MISA-MD/mtp3 包的获取和编译。

:::note
在编译安装阶段，如果遇到编译错误，可以通过添加 verbose 选项：`pkg install --verbose` 来查看具体错误信息。
:::

#### mlip-3 的 GPU 支持
如果需要启用 mtp 的 GPU 支持，需要按如下步骤进行：
1. 编辑 pkg.yaml 文件：
```diff
    git.hpcer.dev/HPCer/MISA-MD/mtp3@v0.2.0@mtp: # use main branch
-     features: ["MTP_ENABLE_HIP_ARCH=OFF"] # hip version
+     features: ["MTP_ENABLE_HIP_ARCH=ON"] # hip version
      optional: true
```
2. 和上面CPU 版本的mlip-3 的安装一样，重新执行 pkg fetch & pkg install
```bash
pkg clean --all
pkg fetch --features=mtp
pkg install
```

### 编译支持 mlip-3 （mtp）势函数的 SupraMD
编译安装完 mlip-3 依赖包后，进行MD软件的编译。命令如下：

<Tabs>
  <TabItem value="host" label="CPU 版本" default>
    ```bash
    cmake --preset=host-default -DCMAKE_BUILD_TYPE=Release -DMD_FEATURE_POT_MLIP2_ENABLE_FLAG=ON
    cmake --build --preset=host-default
    ```
  </TabItem>
  <TabItem value="gpu" label="GPU 版本">
    ```bash
    cmake --preset=dtk-dcc -DCMAKE_BUILD_TYPE=Release -DMD_FEATURE_POT_MLIP2_ENABLE_FLAG=ON
    cmake --build --preset=dtk-dcc
    ```
  </TabItem>
</Tabs>
