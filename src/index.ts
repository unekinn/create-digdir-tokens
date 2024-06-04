import path from "node:path";
import fs from "node:fs/promises";
import { bold, dim, red, green } from "kleur";
import prompts, { Choice, Options } from "prompts";
import {
  getOutputFolderName,
  normalizeTokenSetName,
  toValidPackageName,
} from "./utils.js";
import generateMetadata from "../template/template-files/design-tokens/$metadata.json.js";
import generateThemes from "../template/template-files/design-tokens/$themes.json.js";
import packageJsonTemplate from "../template/template-files/package.json";

const DEFAULT_FILES_PATH = path.join(__dirname, "../template/default-files");

const TOKEN_TEMPLATE_FILES_PATH = path.join(
  __dirname,
  "../template/template-files/design-tokens"
);

const targetArg = process.argv[2] ?? ".";
const TARGET_DIR = path.resolve(process.cwd(), targetArg);
const initialPackageName = toValidPackageName(path.basename(TARGET_DIR));

const MODES = ["Light", "Dark", "Contrast"] as const;
type Mode = (typeof MODES)[number];

interface DirectoryAnswers {
  directoryAction?: "clean" | "ignore" | "exit";
}
interface PackageAnswers {
  packageName: string;
}

interface TokensAnswers {
  tokensDir: string;
  themeCount: number;
  modes: Mode[];
}

interface ThemeAnswers {
  name: string;
}

const promptOptions: Options = {
  onCancel: () => {
    console.log(`${red("✖")} Operation cancelled`);
    process.exit();
  },
};

async function main() {
  console.log();

  // Check target directory contents
  let isTargetDirEmpty = true;
  try {
    const files = await fs.readdir(TARGET_DIR);
    isTargetDirEmpty = files.length === 0;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      // Directory doesn't exist, so we're good
    } else {
      console.error(err);
      console.log("Continuing...");
    }
  }

  const { directoryAction } = (await prompts(
    {
      name: "directoryAction",
      type: isTargetDirEmpty ? null : "select",
      message: "Target directory is not empty. How should we proceed?",
      choices: [
        {
          title: "Clean",
          value: "clean",
          description: "Empty the directory and continue",
        },
        {
          title: "Ignore",
          value: "ignore",
          description:
            "Keep directory as is. Files may be overwritten with new output.",
        },
        {
          title: "Exit",
          value: "exit",
          description: "Exit without doing anything.",
        },
      ],
    },
    promptOptions
  )) as DirectoryAnswers;

  if (directoryAction === "exit") {
    process.exit();
  }

  const { packageName } = (await prompts(
    [
      {
        name: "packageName",
        type: "text",
        message: "Enter a package name (for package.json)",
        initial: initialPackageName,
      },
    ],
    promptOptions
  )) as PackageAnswers;

  const { modes, themeCount, tokensDir } = (await prompts(
    [
      {
        name: "themeCount",
        type: "number",
        message: "How many themes do you want?",
        initial: 1,
        min: 1,
      },
      {
        name: "modes",
        type: "multiselect",
        choices: MODES.filter((x) => x !== "Light").map((mode) => ({
          title: mode,
          value: mode,
        })),
        message: "Which color modes do you want?",
        instructions: `
  Instructions:
    ↑/↓: Highlight option
    ←/→/[space]: Toggle selection
    a: Toggle all
    enter/return: Complete answer
${green("◉")}   Light ${dim("- This is the default mode, and cannot be disabled")}`,
        onState: (obj: { value: Choice[] }) => {
          obj.value.unshift({ title: "Light", value: "Light", selected: true });
        },
      },
      {
        name: "tokensDir",
        type: "text",
        initial: "design-tokens",
        message: `Enter the desired path for the design tokens`,
      },
    ],
    promptOptions
  )) as TokensAnswers;

  const themes: string[] = [];
  const TOKENS_TARGET_DIR = path.join(TARGET_DIR, tokensDir);

  for (let n = 1; n <= themeCount; n++) {
    const theme: ThemeAnswers = await prompts(
      [
        {
          name: "name",
          type: "text",
          message: `Enter the name of the ${ordinal(n)} theme`,
          validate: (value: string) => isValidThemeName(themes, value),
        },
      ],
      promptOptions
    );
    themes.push(theme.name);
  }

  const { defaultTheme = themes[0] } = (await prompts(
    {
      name: "defaultTheme",
      type: themeCount === 1 ? null : "select",
      message: "Select the default theme to export in package.json",
      choices: themes.map((theme) => ({ title: theme, value: theme })),
      initial: 0,
    },
    promptOptions
  )) as { defaultTheme?: string };
  console.log(
    `
Will now create the following:
  ${bold("Package name")}: ${packageName}
  ${bold("Directory")}: ${TARGET_DIR}
  ${bold("Tokens directory")}: ${TOKENS_TARGET_DIR}
  ${bold("Themes")}: ${themes.join(", ")}
  ${bold("Default theme")}: ${defaultTheme}
  ${bold("Color modes")}: ${modes.join(", ")}
`
  );
  if (directoryAction === "clean") {
    console.log(
      bold().red(`Warning: Contents of ${TARGET_DIR} will be deleted`)
    );
  }
  if (directoryAction === "ignore") {
    console.log(
      bold().yellow(
        `Warning: Existing files in ${TARGET_DIR} may be overwritten`
      )
    );
  }

  const res = await prompts(
    {
      name: "proceed",
      type: "confirm",
      message: "Proceed?",
      initial: directoryAction === undefined, // default to proceeding if the output directory is empty
    },
    promptOptions
  );

  if (!res.proceed) {
    process.exit();
  }

  if (directoryAction === "clean") {
    await fs.rm(TARGET_DIR, { recursive: true });
  }

  await fs.cp(DEFAULT_FILES_PATH, path.join(TARGET_DIR), {
    recursive: true,
  });
  if (tokensDir !== "design-tokens") {
    await fs.rename(
      path.join(TARGET_DIR, "design-tokens"),
      path.join(TOKENS_TARGET_DIR)
    );
  }

  try {
    await fs.mkdir(path.join(TOKENS_TARGET_DIR, "themes"));
  } catch {
    // Directory creation failed, probably because the directory already exists
  }

  for (const theme of themes.map(normalizeTokenSetName)) {
    for (const mode of modes.map(normalizeTokenSetName)) {
      // Copy the global file for the color mode
      await fs.cp(
        path.join(
          TOKEN_TEMPLATE_FILES_PATH,
          `primitives/colors/${mode}/global.json`
        ),
        path.join(TOKENS_TARGET_DIR, `primitives/colors/${mode}/global.json`),
        { recursive: true }
      );

      // Create theme primitives for the color mode
      const template = await fs.readFile(
        path.join(
          TOKEN_TEMPLATE_FILES_PATH,
          `primitives/colors/${mode}/theme-template.json`
        )
      );
      await fs.writeFile(
        path.join(TOKENS_TARGET_DIR, `primitives/colors/${mode}/${theme}.json`),
        template.toString("utf-8").replaceAll("<theme>", theme)
      );
    }

    // Create main theme token set
    const template = await fs.readFile(
      path.join(TOKEN_TEMPLATE_FILES_PATH, `themes/theme-template.json`)
    );
    await fs.writeFile(
      path.join(TOKENS_TARGET_DIR, `themes/${theme}.json`),
      template.toString("utf-8").replaceAll("<theme>", theme)
    );

    await fs.writeFile(
      path.join(TOKENS_TARGET_DIR, "$metadata.json"),
      JSON.stringify(generateMetadata(modes, themes), undefined, 2)
    );

    await fs.writeFile(
      path.join(TOKENS_TARGET_DIR, "$themes.json"),
      JSON.stringify(generateThemes(modes, themes), undefined, 2)
    );
  }

  // Configure package.json file
  packageJsonTemplate.name = packageName;
  packageJsonTemplate.main = packageJsonTemplate.main.replace(
    "<default-theme>",
    getOutputFolderName(defaultTheme)
  );
  await fs.writeFile(
    path.join(TARGET_DIR, "package.json"),
    JSON.stringify(packageJsonTemplate, undefined, 2)
  );

  const themeModeCombinations = themes.flatMap((theme) =>
    modes.map((mode): [theme: string, mode: string] => [theme, mode])
  );

  console.log(`
🎉 Files successfully generated!

${bold().underline("Next steps")}

${bold("To use the tokens in Figma:")}
1. Initialise a git repository in ${TARGET_DIR}
2. Push the tokens to GitHub, GitLab or Azure DevOps
3. Set up sync in Tokens Studio for Figma -
   https://docs.tokens.studio/sync/sync
4. Use the "Create variables" action in Tokens Studio -
   https://docs.tokens.studio/variables/creating-variables
5. Push the resulting variables from Tokens Studio to Git

${bold(`Customizing the theme${themes.length > 1 ? "s" : ""}`)}
1. Go to https://theme.designsystemet.no and set up a color theme
2. Press "Kopier tema"
3. Under "Json til Figma", copy the contents under ${modes.join(" / ")} to
   the corresponding file under ${TOKENS_TARGET_DIR}:
${themeModeCombinations.map(([theme, mode]) => `     ${bold(`${theme}, ${mode}`)}: primitives/colors/${normalizeTokenSetName(mode)}/${normalizeTokenSetName(theme)}.json`).join("\n")}
   This can also be done in Tokens Studio for Figma.
4. ${bold("IMPORTANT!")} In the JSON data you copied, replace "theme" on line 2
   with the correct theme identifier, depending on the theme you're customizing.
   This is the same as the json filename without extension (e.g. ${themes.map((x) => `"${normalizeTokenSetName(x)}"`).join(", ")}).
${themes.length > 1 ? "5. Repeat steps 1—4 for the remaining themes" : ""}

${bold("Use the theme in code:")}
In ${TARGET_DIR}
1. Check that the package.json file is set up to your liking
2. npm run build ${dim(`- builds the css files for each theme and outputs them to ./dist`)}
3. npm publish   ${dim(`- will publish the package to npm as ${packageName},
                   unless you manually changed package.json`)}

In a different npm package (e.g. a frontend web app), follow the "Get started"
instructions on https://github.com/digdir/designsystemet but replace
@digdir/designsystemet-theme with ${packageName}. E.g.
- npm i ${packageName} @digdir/designsystemet-css @digdir/designsystemet-react
- import '${packageName}';
  import '@digdir/designsystemet-css';
  import { Button } from '@digdir/designsystemet-react';
`);
}

function isValidThemeName(themes: string[], value: string): true | string {
  const s = value.trim();
  if (s.length === 0) {
    return "Theme name cannot be empty.";
  }
  if (themes.includes(s)) {
    return "Theme names must be unique.";
  }
  if (/[^a-zæøå0-9 _-]/i.test(s)) {
    return "Theme name can only contain letters, numbers, dashes and underscores.";
  }
  return true;
}

function ordinal(n: number): string {
  switch (n) {
    case 1:
      return "1st";
    case 2:
      return "2nd";
    case 3:
      return "3rd";
    default:
      return `${n}th`;
  }
}

void main();
