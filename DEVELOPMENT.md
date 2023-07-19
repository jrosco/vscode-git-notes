# Development

## Packaging

[Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

[vsce](https://github.com/microsoft/vscode-vsce), short for "Visual Studio Code Extensions", is a command-line tool for packaging, publishing and managing VS Code extensions.

### Install

```bash
npm install -g @vscode/vsce
```

### Package

<https://code.visualstudio.com/api/working-with-extensions/publishing-extension#packaging-extensions>

```bash
vsce package -o package/
```

### Publish

<https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publishing-extensions>

```bash
vsce publish
# <publisher id>.myExtension published to VS Code Marketplace
```


## Modules and Development

### install modules

```bash
npm install 
```

### npm scripts

Developing is VsCode you can simply press `F5` to run the debugger.

### compile

```bash
npm run compile
```

#### test

```bash
npm run test
```
