import prompts from "prompts";

interface InitialAnswers {
  themeCount: number;
  modes: Array<"light" | "dark" | "contrast">;
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
      choices: [
        { title: "light", value: "light" },
        { title: "dark", value: "dark" },
        { title: "contrast", value: "contrast" },
      ],
      min: 1,
      message: "Which modes do you want?",
    },
  ]);

  console.log(res);

  const themes: ThemeAnswers[] = [];

  for (let n = 1; n <= res.themeCount; n++) {
    const theme: ThemeAnswers = await prompts([
      {
        name: "name",
        type: "text",
        message: `Enter the name of the ${ordinal(n)} theme`,
        validate: (value) => isValidThemeName(value as string),
      },
    ]);
    themes.push(theme);
  }
  console.log(themes);
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
