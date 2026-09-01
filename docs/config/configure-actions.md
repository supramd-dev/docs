---
sidebar_position: 3
id: configure-actions
title: "Actions 配置项说明"
sidebar_label: "Actions 配置项说明"
---

`stage[].actions` 用于在某个 stage 内对模拟体系施加一些"动作"（action），例如盒子变形（deform）、删除原子（del_atoms）、区域设置速度（velocity）以及 PKA 碰撞设置速度（set_v）等。

actions 的写法借鉴了 gitlab-ci 和 github action：在一个 stage 内可以启用任意多个 action，每个 action 各自按照自己的参数独立执行。

```yaml
stages:
  - name: example
    steps: 1000
    step_length: 0.001
    actions:
      deform:
        axis: x
        e_rate: 1.0e-3
        every_steps: 1
      del_atoms:
        step: 100
        region: [25.0, 25.0, 25.0, 80.4, 80.4, 80.4]
      velocity:
        step: 100
        region: [2, 2, 2, 10, 10, 10]
        v: [0.0, 0.0, 1.0]
      set_v:
        step: 2
        lat: [40, 40, 40, 0]
        energy: 6.8
        direction: [1.0, 1.0, 1.0]
```

目前支持的 actions 如下：

| action | 说明 | 触发方式 |
| -- | -- | -- |
| [deform](#stageactionsdeform) | 沿指定轴对模拟盒子进行单轴拉伸（变形），用于应力-应变计算 | 周期性：每隔 `every_steps` 步执行一次 |
| [del_atoms](#stageactionsdel_atoms) | 删除指定区域内的所有原子 | 一次性：在 stage 内第 `step` 步执行 |
| [velocity](#stageactionsvelocity) | 将指定区域内所有原子的速度设置为给定的速度向量 | 一次性：在 stage 内第 `step` 步执行 |
| [set_v](#stageactionsset_v) | 给指定晶格位置上的原子（PKA）设置速度（级联碰撞） | 一次性：在 stage 内第 `step` 步执行 |

:::note
所有 action 中的 `step` 都是**相对于当前 stage** 的时间步，而非全局时间步。
:::

## stage[].actions.deform
对模拟盒子沿指定轴施加均匀的单轴拉伸（变形），同时对原子位置沿同一轴进行仿射重映射，用于应力-应变（如单轴拉伸）计算。

一个完整的单轴拉伸模拟的配置示例可见 `$MD_PATH/example/deform/config.md-npt-tension.yaml`：沿 x 轴拉伸的同时，通过 [NPT 系综的 `P_xyz` 模式](./configure-ensemble.md#stageensemblenpt_mttkp_xyz) 将 y、z 方向控制到目标压力，等价于 LAMMPS 中 `fix deform` + `fix npt y z` 的组合。

### stage[].actions.deform.axis
类型：String，取值为 `x`、`y` 或 `z`；
说明：盒子被拉伸的轴。该选项为必填项。

### stage[].actions.deform.remap_pos
类型：Boolean；默认值：false;
说明：预留选项。当前实现中，变形的同时原子位置总是随盒子一起被仿射重映射，该选项暂不起作用。

### stage[].actions.deform.e_rate
类型：Float；默认值：1.0e-3；
单位：1/ps（即 1e9 /s）；
说明：工程应变率。程序每隔 `every_steps` 步，将该轴的盒子长度乘以缩放因子
`exp(e_rate × step_length × every_steps)`，
即该选项是微分方程 `dL/dt = e_rate × L` 的精确指数积分器。
例如当 `step_length = 0.001 ps`、`every_steps = 1` 时，每一步盒子长度乘以 `exp(1e-3 × 0.001) ≈ 1 + 1e-6`。
该值必须为正数。

### stage[].actions.deform.every_steps
类型：Integer；默认值：1；
说明：每隔 `every_steps` 步执行一次变形（在一个 stage 内周期性执行）。必须为正整数。

```yaml
    actions:
      deform:
        axis: x          # 沿 x 轴拉伸，可取 x、y、z
        e_rate: 1.0e-3   # 工程应变率，单位 1/ps
        every_steps: 1   # 每 1 步执行一次变形
```

:::tip[与 NPT 系综的配合]
在使用 `actions.deform` 进行单轴拉伸时，建议该 stage 的系综采用 `npt_mttk`，并使用 [`P_xyz` 模式](./configure-ensemble.md#stageensemblenpt_mttkp_xyz) 只对**未拉伸**的轴（横向轴）进行控压，被拉伸的轴不列入 `P_xyz`（其盒子长度完全由变形驱动控制）。
:::

## stage[].actions.del_atoms
在 stage 内指定的时间步，一次性删除指定区域内的所有原子（例如用于构造孔洞、自由表面等缺陷）。

删除原子后，程序会自动更新全局原子数，并在该步后续的通信中重新交换 ghost 原子、重建邻居列表。

### stage[].actions.del_atoms.step
类型：Integer；
说明：执行删除操作的时间步，相对于当前 stage（例如设置为 4，则在该 stage 的第 4 步执行删除）。

### stage[].actions.del_atoms.region
类型：Float 数组，长度：6；
单位：埃, Å；
说明：删除区域，数组的 6 个值依次为区域起点和终点的 x、y、z 坐标：
`[x_low, y_low, z_low, x_high, y_high, z_high]`。
位于该区域内（半开区间 `[low, high)`）的原子会被删除。

```yaml
    actions:
      del_atoms:
        step: 4 # 在当前 stage 的第 4 步删除原子
        region: [ 25.0, 25.0, 25.0, 80.4, 80.4, 80.4 ] # 删除该区域内的所有原子
```

## stage[].actions.velocity
在 stage 内指定的时间步，一次性将指定区域内所有原子的速度**设置为**（覆盖，而非叠加）给定的速度向量。

### stage[].actions.velocity.step
类型：Integer；
说明：执行设置速度操作的时间步，相对于当前 stage。

### stage[].actions.velocity.region
类型：Integer 数组，长度：6；
单位：晶格常数（晶格坐标）；
说明：设置速度的区域，以晶格坐标表示，数组的 6 个值依次为区域起点和终点的 x、y、z 晶格坐标：
`[x_low, y_low, z_low, x_high, y_high, z_high]`。
位于该区域内（半开区间 `[low, high)`）的原子会被设置速度。

### stage[].actions.velocity.v
类型：Float 数组，长度：3；
单位：埃/皮秒, Å/ps；
说明：要设置的速度向量在 x、y、z 三个方向上的分量。

```yaml
    actions:
      velocity:
        step: 100 # 在当前 stage 的第 100 步设置速度
        region: [2, 2, 2, 10, 10, 10] # 晶格坐标区域
        v: [0.0, 0.0, 1.0] # 速度向量，单位 Å/ps
```

## stage[].actions.set_v
在 stage 内指定的时间步，一次性给指定晶格位置上的原子（即 PKA，Primary Knocked-on Atom）设置速度，用于模拟级联碰撞。

程序会根据给定的能量和方向计算 PKA 的速度：
先由能量 `E` 计算速度大小 `v = sqrt(2E / (m × mvv2e))`（其中 `m` 为该原子的质量），
再将速度方向归一化后乘以速度大小，**设置**（覆盖，而非叠加）到该原子上。

:::note
该 action 即之前版本中 stage 下的 `set_v` 配置（`set_v.collision_step`、`set_v.lat`、`set_v.energy`、`set_v.direction`）。
新版本中，它被移动到 `stage[].actions.set_v` 下，且原来的 `collision_step` 字段更名为 `step`。
:::

### stage[].actions.set_v.step
类型：Integer；
说明：执行级联碰撞（设置 PKA 速度）的时间步，相对于当前 stage，而非全局时间步。

### stage[].actions.set_v.lat
类型：Integer 数组，长度：4；
说明：PKA 原子的晶格位置。前 3 项 `lat[0..2]` 为该原子所在单胞（unit cell）的晶格坐标；
第 4 项 `lat[3]` 为子晶格（基元内原子）索引：取 `0` 表示单胞角上的原子，取非 0 值（如 `1`）表示体心位置的原子。
例如模拟 box 为 `[80, 80, 80]` 时，PKA 位置一般可以设置为位于模拟 box 中间的 `[40, 40, 40, 0]`。

### stage[].actions.set_v.energy
类型：Float；
单位：电子伏特, eV；
说明：PKA 原子的能量。实际裂变堆中，PKA 能量一般不超过 50 keV。

### stage[].actions.set_v.direction
类型：Float 数组，长度：3；
说明：PKA 速度方向在 x、y、z 三个维度上的分量（无需归一化，程序会自动归一化）。
例如设置为 `[1.0, 3.0, 5.0]`，则 PKA 速度方向与向量 ⟨1, 3, 5⟩ 平行。

```yaml
    actions:
      set_v:
        step: 2  # 在当前 stage 的第 2 步产生级联碰撞
        lat: [40, 40, 40, 0]  # PKA 原子的晶格位置
        energy: 15000.0  # PKA 能量，单位 eV
        direction: [1.0, 3.0, 5.0]  # PKA 速度方向
```
