# Supported operating systems

The following table lists operating systems supported by nRF Connect for Desktop and all of its applications:

| Operating System          | x86            | x64           | ARM64         |
|---------------------------|----------------|---------------|---------------|
| Windows 11                | Not applicable | Tier 1        | Not supported |
| Windows 10                | Tier 3         | Tier 3        | Not supported |
| Linux - Ubuntu 24.04 LTS  | Not supported  | Tier 1        | Not supported |
| Linux - Ubuntu 22.04 LTS  | Not supported  | Tier 2        | Not supported |
| Linux - Ubuntu 20.04 LTS  | Not supported  | Not supported | Not supported |
| Linux - Debian 12         | Not supported  | Not supported | Tier 1        |
| macOS 26                  | Not applicable | Tier 3        | Tier 3        |
| macOS 15                  | Not applicable | Tier 1        | Tier 1        |
| macOS 14                  | Not applicable | Tier 3        | Tier 3        |
| macOS 13                  | Not applicable | Tier 3        | Tier 3        |

To download and install nRF Connect for Desktop, see [Requirements and installation](./download_cfd.md).

!!! info "Tier definitions"
    **Tier 1**: The tools will always work. The automated build and automated testing ensure that the tools build and successfully complete tests after each change.

    **Tier 2**: The tools will always build. The automated build ensures that the tools build successfully after each change. There is no guarantee that a build will work because the automation tests do not always run.

    **Tier 3**: The tools are supported by design, but are not built or tested after each change. Therefore, the application may or may not work.

    **Not supported**: The tools do not work, but it may be supported in the future.

    **Not applicable**: The specified architecture is not supported for the respective operating system.