---
sidebar_position: 1
id: configure
title: "配置文件"
sidebar_label: "配置文件"
---

SupraMD 从 v0.4.0 开始，使用 [yaml](https://yaml.org) 格式开始作为配置文件的格式（v0.2.0 和 v0.3.x 使用 [toml](https://github.com/toml-lang/toml) 格式)。

## 1.示例

以下展示了 SupraMD 配置文件的部分示例：
```yaml
# <a href='https://yaml.org'>yaml</a> configure file for SupraMD application,
# written by <a href='mailto:genshenchu@gmail.com'>genshen</a>"

title: "SupraMD Configure File"
version: "0.4.0"

simulation:
  phasespace: [50, 50, 50] # box size, the count of lattice at each dimension. #int array type
  cutoff_radius_factor: 1.96125  # the real cutoff radius is cutoff_radius_factor*lattice_const , double type
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
  alloy: # types of alloy
    create_seed: 1024 # random seek for creating atoms in alloy material.
    types: # "weight" must be integer type. e.g. Fe:Cu:Ni = 95:2:3
      - name: Fe
        mass: 55.845
        weight: 97
      - name: Cu
        mass: 63.546
        weight: 2
      - name: Ni
        mass: 58.6934
        weight: 1

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
        file_path: "before_collision.{}.dump"
        by_frame: true
  thermo:
    presets:
      - name: my_thermo
        with: [step, time, temp, pe, ke, etotal]
  logs:
    logs_mode: "console" # logs mode, string; values: "console" output will be printed on console/terminal, "file" logs will be saved in files.
    logs_filename: "" # filename of log file, string; if leaving empty, program will generate an unique log filename. (And by default, output will append the end of log file.).

#stage_template: # stage template may be a feature in next version
# run stages one by one
stages:
  - name: rescale
    step_length: 0.001
    steps: 4
    dump:
      use: my_dump
      every_steps: 2
    rescale: # rescale to a temperature.
      t: 600
      every_steps: 2 # rescale every n steps

  - name: collision
    step_length: 0.0001
    steps: 8
    dump: # dump system atom before collision
      use: collision_dump
      every_steps: 1
    thermo_logs:
      use: my_thermo
      every_steps: 2
    #    del_atoms:
    #      region: [ 25.0, 25.0, 25.0, 80.4, 80.4, 80.4 ]
    #      step: 4 # step relative to current stage.
    set_v:
      collision_step: 2  # unsigned long type, step relative to current stage, not global steps.
      lat: [2, 2, 2, 0]  # int array type
      energy: 6.8  # double, unit: eV, default: 0
      direction: [1.0, 1.0, 1.0]  # double array type, pka direction

  - name: run
    step_length: 0.001
    steps: 6
```

## 2.使用配置文件
你可以在运行 SupraMD 程序时，通过命令行参数指定配置文件路径，程序能够读取配置文件，以进行后续模拟，例如：

```bash
mpirun -n 4 /path/of/supramd  -c /path/of/config.yaml
```
或者：

```bash
mpirun -n 4 /path/of/supramd  --conf=/path/of/config.yaml
```
