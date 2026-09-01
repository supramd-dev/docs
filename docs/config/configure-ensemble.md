---
sidebar_position: 4
id: configure-ensemble
title: "系综（Ensemble）配置项说明"
sidebar_label: "系综（Ensemble）配置项说明"
---

`stage[].ensemble` 用于设置某个 stage 所采用的统计系综（ensemble），即该 stage 内对体系温度、压力等热力学量的控制方式。

```yaml
stages:
  - name: npt
    steps: 100000
    step_length: 0.001
    ensemble:
      type: "npt_mttk"
      npt_mttk:
        T:
          T_begin: 600.0
          T_end: 600.0
          T_damp: 0.1
        P_iso:
          P_begin: 0.0
          P_end: 0.0
          P_damp: 1.0
```

目前支持的系综类型（由 `stage[].ensemble.type` 指定）如下：

| 取值 | 说明 |
| -- | -- |
| `none`（默认） | 该 stage 内不对原子施加任何热浴/压浴作用，原子也不会运动 |
| `nve` | 微正则系综（NVE）：原子按牛顿运动方程演化，不做温度/压力控制，体系总能量近似守恒 |
| `nvt` | 正则系综（NVT）：通过恒温器将体系温度控制到目标温度 |
| `npt_mttk` | 等温等压系综（NPT）：采用 Martyna-Tuckerman-Tobias-Klein（MTTK）方法，同时控制体系的温度与压力 |

## stage[].ensemble.type
类型：String；
说明：该 stage 所采用的系综，可选值为 `none`、`nve`、`nvt`、`npt_mttk`。
若不指定 `ensemble` 配置块或 `type`，默认为 `none`。

## stage[].ensemble.nve
当 `stage[].ensemble.type` 为 `nve` 时，该 stage 进行 NVE（微正则）演化。
NVE 没有额外的配置参数，原子在牛顿运动方程下自由演化，体系总能量近似守恒。

```yaml
    ensemble:
      type: nve
```

## stage[].ensemble.nvt
当 `stage[].ensemble.type` 为 `nvt` 时，该配置块生效，用于设置 NVT（正则）系综的恒温器参数。
SupraMD 的 NVT 系综采用 Nosé-Hoover 链（Nosé-Hoover chain，链长 M = 3）恒温器实现，相比单个 Nosé-Hoover 振子具有更好的遍历性（与 LAMMPS `fix nvt` 默认 `tchain=3` 类似）。

### stage[].ensemble.nvt.type
类型：String；
说明：恒温器算法，目前仅支持 `nose-hoover`。该选项为必填项。

### stage[].ensemble.nvt.T_target
类型：Float；
单位：开, K；
说明：NVT 控温的目标温度。该选项为必填项。

### stage[].ensemble.nvt.tau
类型：Float；
单位：皮秒, ps；
说明：Nosé-Hoover 恒温器的弛豫时间（阻尼时间）。值越小，控温越强；一般取时间步长的数十到数百倍。该选项为必填项。

```yaml
    ensemble:
      type: "nvt"
      nvt:
        type: "nose-hoover"
        T_target: 600.0
        tau: 0.01
```

## stage[].ensemble.npt_mttk
当 `stage[].ensemble.type` 为 `npt_mttk` 时，该配置块生效。
该系综通过 Martyna-Tuckerman-Tobias-Klein（MTK）扩展系统方法，结合 Nosé-Hoover 链（链长 M = 3）、Trotter 算符分裂以及时间可逆、保相体积的积分格式，同时控制体系的温度和各向同性/各向异性压力。

### stage[].ensemble.npt_mttk.tchains / pchains
类型：Integer；默认值：1；
说明：分别为温度热浴和压力热浴的 Nosé-Hoover 链长。
:::note
当前实现中，温度链和压力链的链长固定为 3（M = 3），`tchains` 和 `pchains` 两个选项虽能被解析，但暂不影响实际计算（保留选项）。
:::

### stage[].ensemble.npt_mttk.T
设置温度控制参数。该子块为必填项。

#### stage[].ensemble.npt_mttk.T.T_begin
类型：Float；默认值：0.0；
单位：开, K；
说明：目标温度。

#### stage[].ensemble.npt_mttk.T.T_end
类型：Float；默认值：0.0；
单位：开, K；
说明：（保留选项）模拟结束时的目标温度，用于变温模拟。
:::note
当前实现仅支持恒温控制，实际取 `T_begin` 作为恒定目标温度，`T_end` 暂不生效。若需恒温，请将 `T_begin` 与 `T_end` 设置为相同值。
:::

#### stage[].ensemble.npt_mttk.T.T_damp
类型：Float；默认值：0.1；
单位：皮秒, ps；
说明：温度热浴（粒子链）的弛豫时间参数。

:::note[参数 T_damp 的设置 Tips]
参数 `T_damp` 对应于 Nosé-Hoover 热浴的弛豫时间常数 τ。值越小，热浴与体系耦合越强，控温越严格；过小可能导致振荡，过大则温度涨落大、平衡缓慢。一般取时间步长的几十到几百倍（例如 0.1 ps）。
:::

### 压力控制
压力控制方式有三种：`P_iso`（各向同性）、`P_aniso`（各向异性）、`P_xyz`（按轴控制）。
**三者必须且只能设置其中一种**；若同时设置多种或不设置任何一种，程序会报错。
压力的单位为 bar（`0.0` 表示常压/无外加应力），阻尼时间参数的单位为 ps。

:::note
当前实现仅支持恒压控制，各压力子块中的 `*_end` 选项为保留选项，暂不生效；实际取 `*_begin` 作为恒定目标压力。若需恒压，请将 `*_begin` 与 `*_end` 设置为相同值。
:::

#### stage[].ensemble.npt_mttk.P_iso
设置各向同性（isotropic）压力控制参数，即对体系体积施加统一的应变率，等价于 LAMMPS 中的 `fix npt ... iso Pstart Pstop Pdamp`。

- P_begin：Float，默认 0.0；目标压力（bar）。
- P_end：Float，默认 0.0；（保留选项）结束时的目标压力，当前取 `P_begin`。
- P_damp：Float，默认 0.0；压力阻尼时间参数（ps）。

```yaml
        P_iso: # 各向同性控制，类似 LAMMPS `fix npt ... iso 0.0 0.0 1.0`
          P_begin: 0.0
          P_end: 0.0
          P_damp: 1.0
```

:::note[参数 P_damp 的设置 Tips]
参数 `P_damp` 是气压计（barostat）的弛豫时间常数。值越小，压力控制越紧；一般取时间步长的数百倍（例如 1.0 ps），防止与热浴耦合竞争导致不稳定。注意 `P_damp` 应设置为正数。
:::

#### stage[].ensemble.npt_mttk.P_aniso
设置各向异性（anisotropic）压力控制参数，即 x、y、z 三个方向的盒子尺寸被独立控制，等价于 LAMMPS 中的 `fix npt ... aniso Pstart Pstop Pdamp`（或分别指定 `x ... y ... z ...`）。
适用于需要独立控制三个方向压力的非对称体系，如界面、薄膜、固体相变等模拟。

- Px_begin / Py_begin / Pz_begin：Float，默认 0.0；三个方向的目标压力（bar）。
- Px_end / Py_end / Pz_end：Float，默认 0.0；（保留选项）结束时的目标压力，当前取对应的 `*_begin`。
- Px_damp / Py_damp / Pz_damp：Float，默认 1.0；三个方向各自的压力阻尼时间（ps）。

```yaml
        P_aniso: # 各向异性控制，x/y/z 盒子尺寸独立控制
          Px_begin: 0.0
          Px_end: 0.0
          Px_damp: 1.0
          Py_begin: 0.0
          Py_end: 0.0
          Py_damp: 1.0
          Pz_begin: 0.0
          Pz_end: 0.0
          Pz_damp: 1.0
```

:::note
`P_aniso` 会同时控制 x、y、z 全部三个轴。如果只想控制其中的部分轴，请使用 [`P_xyz`](#stageensemblenpt_mttkp_xyz)。
:::

#### stage[].ensemble.npt_mttk.P_xyz
设置按轴（per-axis）压力控制参数，即**只对在 `P_xyz` 下列出的轴**进行压力控制，未列出的轴不做压浴控制、其盒子长度保持不变。
该模式等价于 LAMMPS 中的 `fix npt ... y Pstart Pstop Pdamp z Pstart Pstop Pdamp`（只控 y 和 z 轴）。

`P_xyz` 下至少需要指定一个轴（`x`、`y` 或 `z`），每个被指定的轴都包含以下三个参数：

- P_begin：Float，默认 0.0；该轴的目标压力（bar）。
- P_end：Float，默认 0.0；（保留选项）结束时的目标压力，当前取 `P_begin`。
- P_damp：Float，默认 1.0；该轴的压力阻尼时间（ps）。

```yaml
        P_xyz: # 按轴控制，只对列出的轴控压，未列出的轴盒子长度保持不变
          y: # 只控制 y 轴
            P_begin: 0.0
            P_end: 0.0
            P_damp: 1.0
          z: # 只控制 z 轴
            P_begin: 0.0
            P_end: 0.0
            P_damp: 1.0
          # x 轴未列出，其盒子长度保持不变
```

:::tip[P_xyz 的典型应用：与 actions.deform 配合做单轴拉伸]
在使用 [`actions.deform`](./configure-actions.md#stageactionsdeform) 沿某个轴（如 x 轴）做单轴拉伸时，该轴的盒子长度完全由变形驱动控制，因此**不应**对该轴做压浴控制。此时应使用 `P_xyz` 模式，只对未拉伸的横向轴（如 y、z 轴）控压，被拉伸的轴不列入 `P_xyz`。

完整的示例可见 `$MD_PATH/example/deform/config.md-npt-tension.yaml`：

```yaml
  - name: tension
    step_length: 0.001
    steps: 60000
    ensemble:
      type: "npt_mttk"
      npt_mttk:
        T:
          T_begin: 600.0
          T_end: 600.0
          T_damp: 0.1
        P_xyz:
          # x 轴由 actions.deform 拉伸，这里只对 y、z 轴控压
          y:
            P_begin: 0.0
            P_end: 0.0
            P_damp: 1.0
          z:
            P_begin: 0.0
            P_end: 0.0
            P_damp: 1.0
    actions:
      deform:
        axis: x          # 沿 x 轴拉伸
        e_rate: 1.0e-3   # 工程应变率，单位 1/ps
        every_steps: 1
```
:::

## 完整示例

### NPT 各向同性恒压示例
以下示例先进行 NVT 弛豫，再进行 NPT 各向同性恒压模拟（参考 `$MD_PATH/example/config.md-npt.yaml`）：

```yaml
stages:
  - name: nvt
    step_length: 0.001
    steps: 2500
    ensemble:
      type: "nvt"
      nvt:
        type: "nose-hoover"
        T_target: 600.0
        tau: 0.01

  - name: npt
    step_length: 0.001
    steps: 100000
    ensemble:
      type: "npt_mttk"
      npt_mttk:
        T:
          T_begin: 600.0
          T_end: 600.0
          T_damp: 0.1
        P_iso: # 各向同性控制
          P_begin: 0.0
          P_end: 0.0
          P_damp: 1.0
```

### NVE 示例
```yaml
stages:
  - name: run
    step_length: 0.001
    steps: 1000
    ensemble:
      type: nve
```
