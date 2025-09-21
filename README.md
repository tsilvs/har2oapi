> [!IMPORTANT]
> I am spread too thin between all of my projects, so if you can support my efforts or wish to contribute - please contact me.
>
> My username here is almost the same on most popular online social platforms.
>
> I am open to business proposals as well. CV at LinkedIn.

> [!WARNING]
> Still in development!
>
> Use this code at your own risk, it was not well-tested!

# `har2oapi`

CLI tool to generate OpenAPI specs from HAR Logs using [`har-to-openapi`](https://www.npmjs.com/package/har-to-openapi) library.

## Plans

Planned CLI call ways:

```sh
har2oapi [OPTIONS] harfile.json # writes to a default $pwd/openapi.$ext
har2oapi [OPTIONS] -p harfile.json # Piped to terminal
har2oapi [OPTIONS] -p harfile.json > openapi.$ext # Piped to a file
har2oapi [OPTIONS] -p harfile.json >> openapi.$ext # Piped & appended to a file
har2oapi [OPTIONS] -o openapi.$ext harfile.json # Out file specified as param
har2oapi [OPTIONS] -o openapi.$ext -i harfile.json
cat harfile.json | har2oapi [OPTIONS] # writes to a default $pwd/openapi.$ext
cat harfile.json | har2oapi [OPTIONS] -p # Piped to terminal
cat harfile.json | har2oapi [OPTIONS] -p > openapi.$ext # Piped to a file
cat harfile.json | har2oapi [OPTIONS] -p >> openapi.$ext # Piped & appended to a file
cat harfile.json | har2oapi [OPTIONS] -o openapi.$ext # Out file specified as param
```

### New features

+ [ ] Multiple OpenAPI Versions support?
+ [ ] Processing time estimates?
+ [ ] Multithreaded big HAR file processing?
+ [ ] Multithreaded multi-file processing?