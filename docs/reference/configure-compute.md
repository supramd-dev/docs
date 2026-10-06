---
sidebar_position: 4
id: configure-compute
title: "Compute 配置项说明"
sidebar_label: "Compute 配置项说明"
---

`stages[].compute` 用于在某个 stage 内对当前构型"计算"一些可观测量（compute），例如径向分布函数（rdf）。

写法与 [`stages[].actions`](./configure-actions.md) 类似：一个 stage 内可以启用任意多个 compute，每个 compute 各自按照自己的参数独立执行、互不影响。

```yaml
stages:
  - name: rdf
    steps: 2000         # 2000 步 = 2 个采样窗口，输出 2 个数据块
    step_length: 0.001
    ensemble:
      type: nve
    compute:
      rdf:
        output: "rdf.csv"    # 输出文件
        nbins: 100           # bin 数
        cutoff: 8.0          # 最大距离 r_max，单位 Å（本页示例的输出即由该配置产生）
        every_steps: 100     # 每 100 步采样一次
        repeat: 10           # 每 10 次采样（即每 1000 步）归约、求平均并写出一块数据
        pairs:               # 需要计算的类型对，可省略（默认计算所有类型对）
          - types: [0, 0]    # type 0 与 type 0，cutoff 单独指定为 5.5
            cutoff: 5.5
          - types: [1, "*"]  # type 1 与所有类型；展开后与上面不重复
```

目前支持的 compute 如下：

| compute | 说明 | 采样方式 |
| -- | -- | -- |
| [rdf](#stagecomputerdf) | 径向分布函数 RDF（g(r) 与配位数），效果等价于 LAMMPS 的 `compute rdf` | 周期性：每隔 `every_steps` 步采样一次，每 `repeat` 次采样归约、求平均后立刻追加一个数据块 |


## stage[].compute.rdf
计算模拟体系在每一对指定原子类型之间的径向分布函数（radial distribution function）。

### stage[].compute.rdf.output
类型：String；默认值：`"rdf.csv"`；  
说明：输出文件路径（相对路径以程序运行目录为基准）。文件由主进程（rank 0）写出，其余进程不产生文件。
进入 stage 时该文件会被**覆盖**：文件头（bin 布局、列的含义与顺序）在此时写入，随后每次写出一个数据块就追加在文件末尾。

:::note
每个 stage 的 compute 相互独立：
对于 rdf 计算，在进入 stage 时创建（覆盖）自己的输出文件并写入必要的文件头，
之后每满 `repeat` 次采样就写出一个数据块；离开 stage 时那些还不足以凑满一个数据块的采样会被丢弃。
:::

### stage[].compute.rdf.nbins
类型：Integer；默认值：100；  
说明：将距离区间 `[0, cutoff]` 均匀划分的 bin 数，必须为正整数。
第 `k` 个 bin（`k` 从 0 开始）覆盖 `[k·dr, (k+1)·dr)`，其中 `dr = cutoff / nbins`；
输出文件中每一行的 `r` 为该 bin 的中心 `(k+0.5)·dr`，`r_lo`、`r_hi` 则是它实际统计的范围
`[k·dr, (k+1)·dr)`。

### stage[].compute.rdf.cutoff
类型：Float；默认值：0.0；  
单位：埃, Å；  
说明：RDF 的最大距离 `r_max`。取默认值 0.0 时使用模拟的截断半径（`simulation.cutoff_radius`）。
该值不能大于 `simulation.cutoff_radius`：邻居列表（以及 hash 结构的邻居偏移）不会超过该距离，否则超出部分的 bin 只会是空的。

:::note
所有原子类型对共用同一套 bin 布局 `[0, r_max]`，其中 `r_max` 取各原子类型对 cutoff 的最大值：
某个原子类型对自身的 `cutoff` 更小时，超出其 cutoff 的 bin 保持为 0。

例如，对于如下的配置：
```yaml
compute:
  rdf:
    nbins: 16
    cutoff: 8.0
    pairs:
      - types: [0, 0]
        cutoff: 5.5
      - types: [0, 1]   # 未写 cutoff，默认用全局 8.0
```
此时 `r_max = max(5.5, 8.0) = 8.0 Å`，`dr = 0.5 Å`。
所有类型对共用 `[0, 8.0]` 的 bin；但 `(0,0)` 只统计到 `5.5 Å`，所以从 `r_lo = 5.5` 的 bin 开始，`g(0-0)` 和 `coord(0-0)` 保持为 0，而 `(0,1)` 仍统计到 `8.0 Å`。
:::

### stage[].compute.rdf.every_steps
类型：Integer；默认值：1；  
说明：每隔 `every_steps` 步采样一次（在一个 stage 内周期性执行，采样步为该 stage 内的第 `every_steps`、`2 × every_steps` … 步，与 thermo、dump 的采样约定一致）。必须为正整数。
采样到的直方图会先累加起来，每 `repeat` 次采样做一次计算（MPI 归约、求平均等），并归一化后写出一个数据块。

### stage[].compute.rdf.repeat
类型：Integer；默认值：1；  
说明：一个数据块由多次采样求平均得到，必须为正整数：每采样 `repeat` 次（即每 `every_steps × repeat` 步）就把这 `repeat` 帧的直方图归约、求平均并写出一个数据块。

:::note
stage 的步数不是 `every_steps × repeat` 的整数倍时，末尾那些采样填不满一个数据块时，会被丢弃（不写入文件，也不结转到下一个数据块）；
离开 stage 时程序会在日志中提示被丢弃的采样次数（`the last N sampled step(s) of this stage do not fill a block of … and are not written out.`）。
:::

:::tip
`repeat: 1`（默认值）表示每次采样立刻写出一个数据块，可用于观察 g(r) 随步数/构型的演化；
`repeat` 取大一些（例如 `1000`）则得到统计更充分的平均值。两种做法给出的数据块格式相同，多个数据块在同一个文件里依次排列，由 `step` 列与 `#` 注释行区分。
:::

### stage[].compute.rdf.pairs
类型：数组；  
默认值：不配置该选项时，计算所有类型对 `(i, j)`（`i <= j`）；  
说明：需要计算的原子类型对列表，数组中的每个元素描述一个类型对。

配置了 `pairs` 之后，输出文件中各列的排列顺序与这里的配置顺序一致；
同一个类型对（`[i, j]` 与 `[j, i]` 视为同一对）重复配置会报错。  
`"*"` 通配符展开出来的类型对同样参与这个检查：`[0, 0]` 后面再写 `[0, "*"]`，会因为 (0, 0) 被请求了两次而报错。

#### stage[].compute.rdf.pairs[].types
类型：数组，长度 2；数组元素为 Integer 或字符串 `"*"`；  
说明：类型对 `(i, j)`。
其中，`"*"` 表示"所有类型"，例如 `[0, "*"]` 表示 type 0 与所有类型的类型对，`["*", "*"]` 表示所有类型对。

:::note[原子类型编号]
原子类型编号（type id）从 **0** 开始：`creation.alloy.types` 中的第一个元素对应 type 0，第二个元素对应 type 1，以此类推（程序日志中的 `type 0`、dump 文件中的 `type` 列使用同一套编号）。
:::


#### stage[].compute.rdf.pairs[].cutoff
类型：Float；默认值：`stage[].compute.rdf.cutoff`；  
单位：埃, Å；  
说明：该类型对的截断半径。与全局 `cutoff` 一样，不能大于 `simulation.cutoff_radius`。

## 输出文件格式
输出为 csv 文件：先是文件头（`r_max`、`nbins`、`dr`、`every_steps`、`repeat`、列的含义与顺序、各类型对的 cutoff），
随后每个数据块由一行注释与 `nbins` 行数据组成。
下面是用本页开头的配置（3 种原子类型、2000 步、每 1000 步一个数据块）实际跑出来的一份输出，只摘录了每个块的开头与第一个配位壳层附近的行：

```csv
# Supra-MD compute rdf (radial distribution function)
# r_max = 8 (A), nbins = 100, dr = 0.08 (A), every_steps = 100, repeat = 10
# g(i-j)(r) = mult * pairs(i-j, r) / ( N(i) * n(j) / volume * 4/3*pi*(r_hi^3 - r_lo^3) ), mult = 2 for i == j and 1 otherwise, n(j) = N(j) - 1 for i == j
# coord(i-j)(r) = mult * (number of j atoms within r of a i atom, averaged over the i atoms)
# columns: step (the last step of the block the row belongs to), r (center of the bin), r_lo and r_hi (its lower and upper edge, in A), then g(i-j) and coord(i-j) for every pair
# pair 1: types 0-0, cutoff = 5.5 (A)
# pair 2: types 0-1, cutoff = 8 (A)
# pair 3: types 1-1, cutoff = 8 (A)
# pair 4: types 1-2, cutoff = 8 (A)
step,r,r_lo,r_hi,g(0-0),g(0-1),g(1-1),g(1-2),coord(0-0),coord(0-1),coord(1-1),coord(1-2)
# block at step 1000: 10 samples over the steps 100 to 1000, volume = 23279.00224 (A^3), N(0) = 800, N(1) = 600, N(2) = 600
1000,0.04,0,0.08,0,0,0,0,0,0,0,0
...
1000,2.52,2.48,2.56,8.111287354,7.962141201,9.783766653,4.826000486,3.12725,2.360875,2.281666667,2.4145
...
# block at step 2000: 10 samples over the steps 1100 to 2000, volume = 23279.00224 (A^3), N(0) = 800, N(1) = 600, N(2) = 600
2000,0.04,0,0.08,0,0,0,0,0,0,0,0
...
2000,2.52,2.48,2.56,8.104442386,8.113301866,9.515940606,4.945511096,3.1335,2.362125,2.282666667,2.416166667
...
```

数据块前的注释行给出该块最后一个采样步、参与平均的采样次数、这些采样覆盖的步区间，以及该块的体积与各类型原子的平均数目（体积会随 NPT、变形等 action 改变，原子数也会随删除/增加原子而改变，因此它们写在每个数据块上，而不是文件头里）。
每写出一个数据块，主进程还会在日志里留下一行，例如：
`rdf of 4 type pairs over 10 samples (steps 1100 to 2000) appended to rdf.csv.`，可用来确认写出的时机与块的内容。

| 列 | 含义 |
| -- | -- |
| `step` | 该行所属数据块最后一个采样步（与 dump 文件中的步数一致，从 1 开始） |
| `r` | bin 中心 `(k+0.5)·dr`，单位 Å |
| `r_lo` | bin 的下边界 `k·dr`，单位 Å |
| `r_hi` | bin 的上边界 `(k+1)·dr`，单位 Å |
| `g(i-j)` | 类型对 `(i, j)` 的 g(r)，每个类型对一列，顺序与 `pairs` 一致 |
| `coord(i-j)` | 类型对 `(i, j)` 的配位数，每个类型对一列，顺序同上 |

每一行的原子对都统计在 `[r_lo, r_hi)` 之内；同一数据块内的 `nbins` 行按 `r` 递增排列，覆盖 `[0, r_max]`。
一般地，相邻两行满足前一行的 `r_hi` 等于后一行的 `r_lo`，第一行的 `r_lo` 为 0，最后一行的 `r_hi` 为 `r_max`。

`g(i-j)` 与 `coord(i-j)` 两列数值的定义与 LAMMPS 的 `compute rdf` 一致（因此两个程序输出的文件可以逐 bin 对比）：

```tex
g(i-j)(r)     = mult * pairs(i-j, r) / ( N(i) * n(j) / V * 4/3*pi*(r_hi^3 - r_lo^3) )
coord(i-j)(r) = mult * ( distance r 以内 j 原子的平均个数 )
```

其中 `r_lo`、`r_hi` 即该行的这两列；
`pairs(i-j, r)` 为距离落在该 bin 内的 i-j 原子对数（i 与 j 相同时按无序对计数）；
`mult` 在 `i == j` 时为 2（同类对以有序对计），否则为 1；
`n(j)` 在 `i == j` 时为 `N(j) - 1`，否则为 `N(j)`；
`N(i)`、`N(j)` 为模拟体系中 i、j 两类原子的总数，`V` 为盒子体积。

:::note[并行计算]
直方图会在所有 MPI 进程之间求和，`g(r)` 与 `coord(r)` 由**全局**计数归一化得到，
因此计算本身不依赖于进程数（`N(i)`、`N(j)`、`V` 都是全局量。  
不过不同进程数下浮点求和顺序不同，热扰动体系的结果不会逐位相同。
:::
