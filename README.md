# Getting started

After checking out the repo:

```
npm install
npm link
```

Then, in a different directory:

```
npm link create-digdir-tokens
```

From that same directory:

```
npm create digdir-tokens some-path
```

Will create the directory `some-path` relative to the current directory, and output the token structure after prompting you for some settings. Running `npm create digdir-tokens` without any arguments will output to the current directory.
