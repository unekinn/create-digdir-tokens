import { bold as kleurBold, dim as kleurDim } from "kleur";
import { normalizeTokenSetName } from "./utils.js";
import { Mode, TARGET_DIR } from "./index.js";

const heading1 = kleurBold().underline;
const heading2 = kleurBold;
const bold = kleurBold;
const italic = kleurDim;
const code = (x: string) => x;
const codeBlock = (x: string) => x;

export function printNextSteps(
  themes: string[],
  modes: Mode[],
  tokensTargetDir: string,
  packageName: string
) {
  const themeModeCombinations = themes.flatMap((theme) =>
    modes.map((mode): [theme: string, mode: string] => [theme, mode])
  );

  return `
${heading1("Next steps")}

${heading2("Using the tokens in Figma")}

1. Initialise a git repository in ${TARGET_DIR}
2. Push the tokens to GitHub, GitLab or Azure DevOps
3. Open the Figma component library and save it to your project -
   https://www.figma.com/community/file/1322138390374166141/designsystemet-core-ui-kit
3. Install "Tokens Studio" plugin in Figma -
   https://tokens.studio
3. Set up sync in Tokens Studio for Figma -
   https://docs.tokens.studio/sync/sync
4. Use the "Create variables" action in Tokens Studio -
   https://docs.tokens.studio/variables/creating-variables
5. Push the resulting variables from Tokens Studio to Git

${heading2(`Customizing the theme${themes.length > 1 ? "s" : ""}`)}

1. Go to https://theme.designsystemet.no and set up a color theme
2. Press "Kopier tema"
3. Under "Json til Figma", copy the contents under ${modes.join(" / ")} to
   the corresponding file under ${tokensTargetDir}:
${themeModeCombinations.map(([theme, mode]) => `     ${bold(`${theme}, ${mode}`)}: primitives/colors/${normalizeTokenSetName(mode)}/${normalizeTokenSetName(theme)}.json`).join("\n")}
   This can also be done in Tokens Studio for Figma.
4. ${bold("IMPORTANT!")} In the JSON data you copied, replace "theme" on line 2
   with the correct theme identifier, depending on the theme you're customizing.
   This is the same as the json filename without extension (e.g. ${themes.map((x) => `"${normalizeTokenSetName(x)}"`).join(", ")}).
${themes.length > 1 ? "5. Repeat steps 1—4 for the remaining themes" : ""}

${heading2("Removing unused themes from Figma components")}

The "Designsystemet - Core UI Kit" component library is set up with the themes
"Theme1" and "Theme2" by default. To ensure our custom theme is used, follow these steps:
1. Access the Variables modal -
   https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables
2. Select the "Theme" collection in the upper left dropdown
3. Select "All variables"
4. Right click the modes "Theme1" and click "Delete mode"
5. Repeat for "Theme2"
6. Publish the library

${heading2("Using the theme in code")}

In ${TARGET_DIR}
1. Check that the package.json file is set up to your liking
2. ${code("npm run build")} ${italic(`- builds the css files for each theme and outputs them to ./dist`)}
3. ${code("npm publish")}   ${italic(`- will publish the package to npm as ${packageName},
                   unless you manually changed package.json`)}

In a different npm package (e.g. a frontend web app), follow the "Get started"
instructions on https://github.com/digdir/designsystemet but replace
@digdir/designsystemet-theme with ${packageName}. E.g.
- ${code(`npm i ${packageName} @digdir/designsystemet-css @digdir/designsystemet-react`)}

${codeBlock(
  `
import '${packageName}';
import '@digdir/designsystemet-css';
import { Button } from '@digdir/designsystemet-react';
`.trim()
)}`;
}
