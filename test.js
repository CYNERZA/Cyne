import * as marked from 'marked';
import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';

// Configure marked to use TerminalRenderer
marked.setOptions({
  renderer: new TerminalRenderer({
    reflowText: true,
    width: 100,
    heading: chalk.cyan.bold,
    codespan: chalk.green,
    strong: chalk.bold,
    em: chalk.italic
  })
});

// Sample markdown content
const markdownContent = `
# Brave Search Results

## FAQ Results

1. **What is Tecosys?**  
   Tecosys is an AI startup building proprietary LLMs and intelligent systems.  
   Source: https://www.tecosys.in/about

## Web Results

1. **Tecosys.in**  
   Tecosys is building the next generation proprietary AI models (LLMs and SLMs)...  
   URL: https://www.tecosys.in/

2. **Tecosys on GitHub**  
   Open-source contributions by Tecosys for AI and tooling  
   URL: https://github.com/Tecosys

3. **LinkedIn - Tecosys**  
   Explore professional updates and news from Tecosys  
   URL: https://linkedin.com/company/tecosysin
`;

// Output to terminal
console.log(marked.parse(markdownContent));
