# uikit-themeのコンパイル方法

下記のnpmパッケージをインストールする

```
npm install -g less-plugin-clean-css
npm install less -g
```

githubからuikitのリポジトリをcloneする

```
git clone https://github.com/uikit/uikit.git
```

uikit\src\less\フォルダにcustomフォルダをコピーする

uikit\src\less\customフォルダにて、下記のコマンドを実行する

```
lessc uikit.theme.less uikit.theme.css
```

minifyするときは、下記のコマンドを実行する

```
lessc --clean-css uikit.theme.less uikit.theme.min.css
```