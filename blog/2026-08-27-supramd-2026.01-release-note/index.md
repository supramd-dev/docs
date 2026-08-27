---
slug: release-note-2026.01
title: SupraMD Release Notes v2026.01
# authors: [genshen]
tags: [supramd, GPU]
---

# SupraMD Release Notes

**版本：v2026.01**

---

### 概述

本版本是 SupraMD 分子动力学模拟软件自 v0.4.0 以来的一次重大更新。项目经历了从 **CrystalMD → MISA-MD → SupraMD** 的名称演进，并在计算能力、势函数支持、GPU 加速、系综方法、数据结构等方面实现了全面升级。
{/* truncate */}

---

### 主要新功能

#### 1. GPU/HIP 加速计算

- **EAM 势能 GPU 计算**：支持在 HIP (AMD GPU/DCU) 平台上进行 EAM 势能计算，包括电子密度 (rho)、嵌入能 (df) 和力的计算。
- **多种 GPU 内核策略**：提供 `thread-atom`、`block-atom`、`wavefront-atom` 三种内核策略，适配不同计算场景。
- **双缓冲机制 (Double Buffer)**：实现 GPU 计算与 MPI 通信的重叠，提升整体效率。
- **Verlet 邻居列表 GPU 构建**：支持在 GPU 端构建 Verlet 邻居列表。
- **Newton 第三定律 GPU 支持**：在 GPU 端支持开启/关闭 Newton 第三定律。
- **CLI 选项 `--acc-gpu`**：通过命令行参数启用 GPU 加速。
- **CLI 选项 `--acc-nei`**：控制是否在 GPU 上构建邻居列表。

#### 2. Verlet-List 数据结构

- 新增 **Verlet 邻居列表**数据结构，作为原有 hash-based 数据结构的替代方案。
- 支持基于 Verlet-list 的 EAM 势能计算。
- 支持 Verlet-list 的 ghost 原子通信和 out-of-box 通信。
- 支持通过 CMake 选项在 hash-based 和 verlet-list 之间切换。
- 支持 SoA (Structure of Arrays) 内存布局下的 Verlet-list。

#### 3. 机器学习势函数 (MLIP/MTP)

- 集成 **MLIP-2** 和 **MLIP-3** 机器学习原子间势。
- 支持基于 Verlet-list 的 MLIP 势能计算。
- 支持 MTP (Moment Tensor Potential) GPU 加速（通过 `--acc-gpu` 启用）。
- 支持将 MLIP 势能输出到标准热力学日志。
- 通过 CMake 选项 `MD_FEATURE_POT_MLIP2_ENABLE_FLAG` 控制是否启用。

#### 4. 系综方法

- **Nose-Hoover NVT 系综**：实现 Nose-Hoover 恒温算法。
- **MTK NPT 系综**：实现基于 Martyna-Tobias-Klein 方法的 NPT 系综控制。
  - 支持 Nose-Hoover Chains。
  - 支持 Suzuki-Yoshida 多步积分。
  - 对称算子分裂用于速度和体积更新。
- **分阶段系综设置**：支持在模拟的不同 stage 中使用不同的系综方法。

#### 5. 多原子类型与晶格支持

- 支持 **多原子类型**模拟（如 Fe-Cu-Ni 合金）。
- 新增 **FCC** 和 **HCP** 晶格创建支持（通过 `lattice.style` 配置）。
- 支持 3D 晶格常数（非等轴晶格）。
- 支持通过配置文件设置晶格原矢 (primitive vectors)。

#### 6. KMC（动力学蒙特卡洛）模拟

- 新增 **KMC 模拟模块**，支持串行 KMC 和多线程搜索。
- 独立的 KMC 配置文件解析。
- 独立的 KMC 可执行文件 (`misa-akmc` / `super_akmc`)。
- 通过 CMake 选项 `MD_COMPONENT_KMC` 控制是否编译 KMC 组件。

#### 7. 模拟 API

- 提供 **MD 模拟 API**，允许外部程序调用 MD 模拟功能。
- 附带弛豫 (relax) 示例演示 API 使用方法。

#### 8. 配置系统全面升级

- 配置文件从 TOML 格式迁移到 **YAML 格式** (`config.yaml`)。
- 支持分阶段 (stages) 配置，每个 stage 可设置不同的系综、步长等。
- 支持可变步长 (variable step length)。
- 支持温度重标度 (rescale) 配置。
- 支持从配置文件解析势能类型和格式。
- 支持 `del_atoms`（删除指定区域原子）配置。
- 支持 `read_phase`（从二进制文件读取原子数据）配置。
- 支持 `velocity` 阶段动作（为指定区域原子设置速度）。

#### 9. 输出系统增强

- **Dump 格式输出**：支持以 `.dump` 格式输出原子数据。
- **按帧输出 (by frame)**：支持按帧模式输出。
- **自定义输出字段**：通过 `dump presets` 的 `with` 字段选择输出内容（位置、速度、力等）。
- **区域输出**：通过 `region` 字段输出指定区域的原子。
- **热力学输出**：
  - 支持输出到 CSV/YAML 文件。
  - 支持输出系统总能量 (PE + KE)。
  - 支持输出体积和盒子尺寸 (Lx, Ly, Lz)。
  - 支持输出压强和维里 (virial)。
- **二进制格式输出**：新版二进制格式支持自定义字段。
- **MPI-IO 合并输出**：使用 MPI-IO 将多进程输出合并为单一文件。

#### 10. 项目重命名与升级

- 项目从 **CrystalMD** 更名为 **MISA-MD**，最终更名为 **SupraMD**。
- 可执行文件使用 `supra` 前缀（`supramd`、`super_akmc`），同时保留 `misamd`/`misa-akmc` 兼容链接。
- 宏定义前缀从 `CRYSTALMD`/`CRYSTAL` 更改为 `MISA_MD`/`MISA`。

---

### 次要新功能与改进

#### 模拟功能

- 支持从 `.dump` 格式文件初始化系统。
- 支持从二进制文件读取原子数据 (`read_phase`)。
- 支持模拟过程中更新原子数量。
- 支持将模拟移动到指定步数。
- 支持在指定区域删除原子。
- 支持运行时力检查（避免过大的力）。
- 支持设置零动量。
- 碰撞 (collision) 中 PKA 单位改为 eV。

#### 随机数生成器

- 新增多种随机数生成器：LCG、Mersenne Twister、STC、Xoshiro、Legacy。
- 自动模式下记录随机种子。

#### 日志与诊断

- 支持日志输出到文件。
- 支持彩色日志（自动检测终端）。
- 模拟性能日志（每个 stage 的性能统计）。
- `--version` 输出 Git 信息和编译特性。

#### 构建系统

- 支持 AoS/SoA 内存布局的 CMake 选项。
- 新增 CMake Presets（host 和 HIP 构建）。
- 支持天河三号 (TianHe-3) 环境。
- 支持神威 (Sunway) 太湖之光超算。
- 改进 Fortran 库链接（兼容 flang）。
- 生成文件移至 `${CMAKE_BINARY_DIR}/generated` 目录。
- CMake 选项统一添加 `MD_` 前缀。

#### 依赖更新

- **libcomm**：升级至 v0.7.0+（支持多晶格常数、内部节点 MPI rank 映射）。
- **kiwi**：升级至 v0.5.1。
- **googletest**：升级至 1.12.0。
- **yaml-cpp**：升级至 0.7.0。
- **potential lib**：升级至 v0.3.0。
- 新增 **hip-potential** 可选包。

#### 性能优化

- 使用 `memset` 清零 SoA 布局下的力和 EAM 数组。
- 为间隙原子添加 HashTable 以降低搜索时间复杂度。
- 改进 Verlet-list 邻居列表构建性能。
- 使用 LDS (Local Data Share) 存储邻居偏移索引。
- 邻居偏移排序以优化 GPU 内核中的内存访问模式。

---

### 重要修复

- 修复 Verlet-list 邻居构建中不正确的邻居单元访问。
- 修复 EAM 计算中 Newton 第三定律开启时的重索引遗漏。
- 修复 NPT 中压强传递错误（仅传递维里部分）。
- 修复 MLIP 中 Newton 第三定律使用不正确导致的势能错误。
- 修复 MPI-IO 输出中原子数据对齐问题。
- 修复多个内存泄漏和段错误问题。
- 修复 ghost 原子通信中的多种边界情况。

---

### 破坏性变更 (Breaking Changes)

| 变更 | 说明 |
|------|------|
| 配置文件格式 | 从 TOML 迁移到 YAML |
| CMake 选项前缀 | 所有选项添加 `MD_` 前缀 |
| `creation.create_t_set` | 已移除，使用 `rescale` 替代 |
| 架构 API | `${ARCH_NAME}_accelerate_init` → `${ARCH_NAME}_domain_init` |
| 可执行文件名 | 更名为 `supramd` / `super_akmc` |
| `cutoff_radius_factor` | 重命名为 `cutoff_radius` |

---

### 平台支持

| 平台 | 状态 |
|------|------|
| x86_64 CPU (MPI) | ✅ 完整支持 |
| AMD GPU / DCU (HIP) | ✅ EAM + MLIP 加速 |
| 神威太湖之光 | ✅ 支持 |
| 天河三号 | ✅ 支持 |

---

### 升级指南

1. **配置文件**：将原有 TOML 配置迁移为 YAML 格式，参考 `example/config.yaml`。
2. **CMake 选项**：所有自定义 CMake 选项需添加 `MD_` 前缀。
3. **温度设置**：使用 `rescale` 替代已移除的 `creation.create_t_set`。
4. **GPU 用户**：使用 `--acc-gpu` 启用 GPU 加速，`-g` 指定每节点 GPU 数量。
