---
sidebar_position: 6
id: compiling-with-hthreads
title: "编译构建: 添加 MT3000（迈创3000）异构支持"
sidebar_label: "编译构建: 添加 MT3000 支持"
---

## 准备
在开始之前，务必确保构建环境中已经加载了C/CXX编译器、dsp 编译器、MPI、CMake、make、pkg等工具或者环境。

例如，可以通过以下命令加载MPI和cmake（实际需要根据具体机器环境进行加载）：
```bash
module purge
module load mpich/mpi-x
module load cmake/3.25.0
```

另需要保证 [pkg](https://github.com/genshen/pkg) 工具已经安装。

## 开始构建
和其他平台一样，在开始之前，需要对依赖包进行构建：
```bash
pkg fetch
pkg install
```

依赖包构建完成后，可以通过如下的命令构建 SupraMD，其中`MD_TH_ARCH_ENABLE_FLAG` 表示启用 hthreads和DSP硬件支持，`MD_TH_ARCH_SRC_PATH` 指定DSP异构源代码位置。

```bash
cmake -B./cmake-build-hthreads -S./ \
    -DMD_COMPONENT_KMC=OFF \
    -DMD_ATOM_ELEMENT_LEGACY_MODE=ON \
    -DMD_TH_ARCH_ENABLE_FLAG=ON \
    -DMD_TH_ARCH_SRC_PATH=src/arch/hthreads
cmake --build ./cmake-build-hthreads -j 8
```

如果需要指定 MT3000 环境的位置，可以用`MT3000_ENV_ROOT`选项指定，默认的位置是`/vol8/appsoftware/mt3000_programming_env-inbox/mt3000_programming_env/`。
```bash
cmake -B./cmake-build-hthreads -S./ \
    -DMD_COMPONENT_KMC=OFF \
    -DMD_ATOM_ELEMENT_LEGACY_MODE=ON \
    -DMD_TH_ARCH_ENABLE_FLAG=ON \
    -DMD_TH_ARCH_SRC_PATH=src/arch/hthreads \
    -DMT3000_ENV_ROOT=/vol8/appsoftware/mt3000_programming_env-inbox/mt3000_programming_env/
```

## 运行
以下是两种典型的运行方式（配合作用调度系统）：
```bash
yhrun --mpi=pmix -N 1 -n 4 -p mt_test ../cmake-build-hthreads/bin/supermd -c config.md.yaml # CPU 模式运行
yhrun --mpi=pmix -N 1 -n 4 -p mt_test ../cmake-build-hthreads/bin/supermd -c config.md.yaml --acc-dsp # DSP 模式运行
```
其中，MT3000 架构上，除supermd 的通用参数外（如指定配置文件路径），还有一些和 DSP异构架构相关的命令行参数：
- `--acc-dsp`: 指定是否启用 DSP 加速计算模式。如果不指定，则默认采用 CPU 运行分子动力学计算；指定则将 EAM 势函数的力场计算放到 DSP 上进行计算。
- `--image`: 指定需要加载的 DSP kernel 镜像文件的路径。如果需要自定义 DSP 的镜像文件，则可以在命令行中用 `--image <path>` 指定（可以采用相对路径），如：
    ```bash
    ../cmake-build-hthreads/bin/supermd --conf config.md.yaml --acc-dsp --image ../cmake-build-hthreads/src/arch_th/src/device/supramd_kernel.dev.dat
    ```

## 附录：计算结果的简单验证
为了验证 DSP 架构计算的结果是否正确，可以和CPU版本进行对比。下面的这个输入配置文件可简单用于检验程序的正确性。  
在 supramd 程序运行完后，会有若干个supermd.*.dump 文件，将其和相同进程数下的CPU版本进行对比，如果DSP上的计算正确，其必须满足如下标准：
- 相同 id 的原子的位置一致（一般是6位有效数字完全一致）
- 相同 id 的原子的速度一致（一般是6位有效数字完全一致）
- 相同 id 的原子的受力一致（6位有效数字完全一致，或者都趋近为0（如 < 1e-12））

```yaml
# <a href='https://yaml.org'>yaml</a> configure file for Supra-MD application,
# written by <a href='mailto:genshenchu@gmail.com'>genshen</a>"

title: "Supra-MD Configure File"
version: "2026.01"
contributors:
  original_author: "BaiHe"
  original_author_email: "baihe_ustb@163.com"
  developers: ["BaiHe<baihe_ustb@163.com>", "ChuGenshen<genshenchu@gmail.com>"]
  organization: "USTB"

# for BCC struct
simulation:
  phasespace: [20, 20, 20] # box size, the count of lattice at each dimension. #int array type
  cutoff_radius: 5.6 # the real cutoff radius, double type
  lattice_const: 2.85532   # lattice const, double type
  def_timesteps_length: 0.001  # simulation time steps length for each timestep, double type.

potential: # potential file config
  format: "setfl" # string type
  type: "eam/alloy" # string type. Potential type used for simulation. Its value can be "eam/fs" or "eam/alloy".
  file_path: "FeCuNi.eam.alloy" # string type

creation: #  create atoms.
  create_phase: true  # boolean type. true: create atoms, false: ignore.
  create_seed: 466953 # int type, for create mode
  create_t_set: 600 # temperature double type, for creation mode
  lattice:
    style: bcc # or sc, or bcc, or fcc, or hcp
    # pv: # primitive vector
    # - [1, 0, 0]
    # - [0, 1.732, 0]
    # - [0, 0, 1.593]
  alloy: # types of alloy
    create_seed: 1024 # random seek for creating atoms in alloy material.
    types: # "weight" must be integer type. e.g. Fe:Cu:Ni = 95:2:3
      - name: Fe
        mass: 55.845
        weight: 97
      - name: Cu
        mass: 63.546
        weight: 0
      - name: Ni
        mass: 58.6934
        weight: 0

read_phase: # read atoms data from a file. It can be used for restart.
  enable: false
  version: 0
  file_path: "./10.atom" # string type, for read mode.
  init_step: 10 # initial step for simulation

output:
  atom_dump:
    presets:
      - name: my_dump
        region: [ 25.0, 25.0, 25.0, 80.4, 80.4, 80.4 ]
        mode: "bin" # output mode,string, "bin"(write all atom into a binary file) or "debug" (output atoms directly), or "dump" (the same as lammps dump);
        file_path: "misa_mdl.{}.out" # string,filename or path of dumped atoms, default value is "misa_mdl.out"
        by_frame: true # bool type, used in copy mode, dump to multiple files, one file for each frame.
        with: [location, velocity] # or "force", select what to dump
      - name: collision_dump
        mode: "dump"
        with: [location, velocity, force]
        file_path: "supermd.{}.dump"
        by_frame: true
  thermo:
    presets:
      - name: my_thermo
        output_target: md.csv # can be "stdout" or "xxx.yaml", or "xxx.csv" file
        with: [step, time, temp, press, Pxx, Pyy, Pzz, Pxy, Pxz, Pyz,  pe, ke, etotal]
  logs:
    logs_mode: "console" # logs mode, string; values: "console" output will be printed on console/terminal, "file" logs will be saved in files.
    logs_filename: "" # filename of log file, string; if leaving empty, program will generate an unique log filename. (And by default, output will append the end of log file.).

#stage_template: # stage template may be a feature in next version
# run stages one by one
stages:
  - name: run
    step_length: 0.001
    steps: 4
    dump: # dump system atom before collision
      use: collision_dump
      every_steps: 1
    #    ensemble:
    #      type: nve
```