import path from "path";
import fs from "fs/promises";
import prompts from "prompts";
import { normalizeTokenSetName } from "./utils.js";
import generateMetadata from "../template/template-files/design-tokens/$metadata.json.js";
import generateThemes from "../template/template-files/design-tokens/$themes.json.js";

const DEFAULT_FILES_PATH = path.join(
  __dirname,
  "../template/default-files/design-tokens"
);
const TOKEN_TEMPLATE_FILES_PATH = path.join(
  __dirname,
  "../template/template-files/design-tokens"
);

const targetArg = process.argv[2] ?? ".";
const TARGET_DIR = path.resolve(process.cwd(), targetArg);

const MODES = ["Light", "Dark", "Contrast"] as const;
type Mode = (typeof MODES)[number];

interface InitialAnswers {
  tokensDir: string;
  themeCount: number;
  modes: Mode[];
}

interface ThemeAnswers {
  name: string;
}

async function main() {
  const res: InitialAnswers = await prompts([
    {
      name: "themeCount",
      type: "number",
      message: "How many themes do you want?",
    },
    {
      name: "modes",
      type: "multiselect",
      choices: MODES.map((mode) => ({ title: mode, value: mode })),
      min: 1,
      message: "Which modes do you want?",
    },
    {
      name: "tokensDir",
      type: "text",
      initial: "design-tokens",
      message: `Enter the desired path for the design tokens`,
    },
  ]);

  const themes: string[] = [];
  const TOKENS_TARGET_DIR = path.join(TARGET_DIR, res.tokensDir);

  for (let n = 1; n <= res.themeCount; n++) {
    const theme: ThemeAnswers = await prompts([
      {
        name: "name",
        type: "text",
        message: `Enter the name of the ${ordinal(n)} theme`,
        validate: (value) => isValidThemeName(value as string),
      },
    ]);
    themes.push(theme.name);
  }

  await fs.cp(DEFAULT_FILES_PATH, path.join(TARGET_DIR, "design-tokens"), {
    recursive: true,
  });
  try {
    await fs.mkdir(path.join(TOKENS_TARGET_DIR, "themes"));
  } catch {
    // Directory creation failed, probably because the directory already exists
  }

  for (const theme of themes.map((x) => normalizeTokenSetName(x))) {
    for (const mode of res.modes.map(normalizeTokenSetName)) {
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
      JSON.stringify(generateMetadata(res.modes, themes), undefined, 2)
    );

    await fs.writeFile(
      path.join(TOKENS_TARGET_DIR, "$themes.json"),
      JSON.stringify(generateThemes(res.modes, themes), undefined, 2)
    );
  }
}

function isValidThemeName(s: string): true | string {
  if (/\//i.test(s)) {
    return 'Theme name cannot contain the "/" character.';
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
