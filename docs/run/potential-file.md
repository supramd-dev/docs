---
sidebar_position: 2
id: potential-file
title: "准备势表文件"
sidebar_label: "准备势表文件"
---

SupraMD 使用EAM势进行原子间的力的计算, 在开始运行之前，需要准备EAM势函数表。

这里的例子使用[www.ctcms.nist.gov](https://www.ctcms.nist.gov/potentials/Download/2009--Bonny-G-Pasianot-R-C-Castin-N-Malerba-L--Fe-Cu-Ni/1/FeCuNi.eam.alloy) 提供的势表文件。

```bash
cd $MD_PATH
wget https://www.ctcms.nist.gov/potentials/Download/2009--Bonny-G-Pasianot-R-C-Castin-N-Malerba-L--Fe-Cu-Ni/1/FeCuNi.eam.alloy -O example/FeCuNi.eam.alloy
```
我们将势函数表文件下载到`$MD_PATH/example`目录(当然，如果你的系统无法连接互联网，也可以在别处下载，上传/拷贝到该目录)，并与确保配置文件中的势表文件路径相一致。

## CD-EAM 势表文件
使用浓度相关 EAM 势（`potential.type` 为 `eam/cd`）时，需要的是二元合金的势表文件，
即在 setfl 表之后追加了 `h(x)` 多项式系数的文件（详见 [CD-EAM 势函数](../reference/configure-potential.md#cd-eam-势函数)）。
以 Fe-Cr 的 CD-EAM 势为例，可以从 [www.ctcms.nist.gov](https://www.ctcms.nist.gov/potentials/Download/2009--Stukowski-A-Sadigh-B-Erhart-P-Caro-A--Fe-Cr/1/FeCr.cdeam) 下载：

```bash
cd $MD_PATH
wget https://www.ctcms.nist.gov/potentials/Download/2009--Stukowski-A-Sadigh-B-Erhart-P-Caro-A--Fe-Cr/1/FeCr.cdeam -O example/FeCr.cdeam
```

使用该势表文件时需要注意：

- [`creation.alloy.types`](../reference/configure-terms.md#creationalloytypes) 中恰好配置两种原子，
  分别对应势表文件中的两种元素（顺序一致）；
- [`simulation.cutoff_radius`](../reference/configure-terms.md#simulationcutoff_radius) 与势表文件中的截断距离一致
  （该文件为 5.5 Å）；

完整的配置示例见 [CD-EAM 势函数](../reference/configure-potential.md#cd-eam-势函数)。
