---
sidebar_position: 2
id: potential-file
title: "准备势表文件"
sidebar_label: "准备势表文件"
---

SupraMD 使用EAM势进行原子间的力的计算, 在开始运行之前，需要准备EAM势函数表。

这里的例子使用[www.ctcms.nist.gov](https://www.ctcms.nist.gov/potentials/Download/Fe-Cu-Ni-GB/FeCuNi.eam.alloy) 提供的势表文件。

```bash
cd $MD_PATH
wget https://www.ctcms.nist.gov/potentials/Download/Fe-Cu-Ni-GB/FeCuNi.eam.alloy -O example/FeCuNi.eam.alloy
```
我们将势函数表文件下载到`$MD_PATH/example`目录(当然，如果你的系统无法连接互联网，也可以在别处下载，上传/拷贝到该目录)，并与确保配置文件中的势表文件路径相一致。