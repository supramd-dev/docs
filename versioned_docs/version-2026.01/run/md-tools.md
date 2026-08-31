---
sidebar_position: 3
id: md-tools
title: "md-tools 工具"
sidebar_label: "md-tools 工具"
---

SupraMD 模拟结束后，会产生二进制的原子信息文件，我们需要使用 md-tools 工具(v0.3.0)将其转化为可读的文本文件。

> md-tools工具目前支持 OS X, linux系统；linux版本中包含amd64， arm等主流架构版本，OS x包含主流的amd64版本。


:::caution
SupraMD 从 0.5.0 开始，采用了新的二进制输出格式，需要使用 md-tools v0.3.0 及其以上的版本（可能需要自行编译）才能正确地完成文件格式的转换。
:::
## 1. 基本命令
### 1.1 md-tools --help命令
查看帮助信息。
```bash
$ md-tools conv -h
md-tools-conv 
convert binary MD results to text files.

USAGE:
    md-tools conv [FLAGS] [OPTIONS] --input <input>... --format <FORMAT> --standard <STANDARD> --ranks <RANKS>

FLAGS:
    -d, --dry        Do everything except actually process files
    -h, --help       Prints help information
    -V, --version    Prints version information

OPTIONS:
    -f, --format <FORMAT>        output format(xyz, text, db, def) [possible values: xyz, text]
    -i, --input <input>...       Sets the filename of input files
    -o, --output <output>        Sets the filename of output file [default: md-output]
    -r, --ranks <RANKS>          ranks to run the parallel program
    -s, --standard <STANDARD>    binary file standard [default: current] [possible values: current,
                                 next]
```

更多md-tools相关内容，请参考 https://git.hpcer.dev/HPCer/SupraMD/md-tools 或 https://github.com/SupraMD/md-tools 。

### 1.2 转换模拟结果文件到文本文件
命令示例：
```bash
md-tools conv -f text -r 16 -s next -i ./misa_md.10.out -o 10.txt
```
上面的例子中，-i 选项（或--input选项）指定MD模拟结果的二进制文件路径； -o （或--output） 选项指定转换的可读文本文件路径； -r选项（或--ranks）指定模拟时使用的MPI进程数(这里是16个MPI进程)；
-s （或 --standard）指定二进制文件的标准，SupraMD v0.5.0 之前的版本输出的二进制文件应采用 `current` 标准，v0.5.0及以后的 SupraMD 版本应采用 `next` 标准；
-f（或 --format）选项指定转换后的文件格式，目前支持xyz(用于可视化的xyz格式)和text (包含粒子速度、位置、类型等信息的文本文件) 两种格式。

如果要转换为可视化的xyz格式，只需设置--format选项为xyz即可:
```bash
md-tools conv -f xyz -r 16 -s next -i ./misa_md_md.10.out -o 10.xyz
```