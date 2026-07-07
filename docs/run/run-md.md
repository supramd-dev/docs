---
sidebar_position: 1
id: run-md
title: "运行  SupraMD"
sidebar_label: "运行 SupraMD"
---


我们假设你通过以上步骤已经完成了 SupraMD 的编译构建工作，
编译完成的二进制可执行文件位于`$MD_PATH/build/bin/` 目录下。

## 1.运行
你可以使用 `mpirun` 命令运行并行的 SupraMD 分子动力学软件。
例如，下面的示例中，使用4个MPI进程运行 SupraMD，并指定配置文件路径为和example同一目录下的`config.yaml`文件。

?> 关于配置文件的相关说明请参考**配置项**等相关章节。

```bash
cd $MD_PATH/example
mpirun -n 4 ../build/bin/supramd -c config.yaml
```

更多信息可以通过执行`$MD_PATH/build/bin/supramd --help`命令查看。

```bash
$ cd $MD_PATH
$ build/bin/supramd --help
  build/bin/supramd {OPTIONS}

    This is SupraMD program.

  OPTIONS:

      -h, --help                    Display this help menu
      -c[conf], --conf=[conf]       The configure file
      -v, --version                 show version number
```

## 2.运行结果

运行完成后，example目录下会多出一个名为misa_md.\*.out 的二进制文件(misa_md.\*.out为默认的输出文件名称，可在配置文件中更改)。
该文件中包含各个指定时间步dump的所有原子信息，如原子类型、id、位置坐标、速度等。

需要注意的是，该文件是二进制文件，无法直接查看，需要转化为可方便查看的文本文件。  
可以使用`md-tools` 转化工具将二进制文件转化为文本文件md.txt ：
```bash
md-tools -f text -r 4 -i ./misa_md.origin.out -o md.txt
```

更多关于`md-tools`工具的信息及使用方法请参照**[md-tools 工具](md-tools.md)**章节。
