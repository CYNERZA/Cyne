# CYNE

<p align="center">
  <img src="https://github.com/CYNERZA/cyne/assets/1/f81b1f2b-3f29-4c4b-854c-47a38bca7256" alt="CYNE Logo" width="200"/>
</p>

<p align="center">
  <strong>A terminal-based AI coding assistant that helps you write, understand, and improve your code.</strong>
</p>

<p align="center">
  <a href="https://github.com/CYNERZA/cyne/actions/workflows/build.yml">
    <img src="https://github.com/CYNERZA/cyne/actions/workflows/build.yml/badge.svg" alt="Build Status">
  </a>
  <a href="https://www.npmjs.com/package/cyne">
    <img src="https://img.shields.io/npm/v/cyne.svg" alt="NPM Version">
  </a>
  <a href="https://github.com/CYNERZA/cyne/blob/main/LICENSE.md">
    <img src="https://img.shields.io/npm/l/cyne.svg" alt="License">
  </a>
</p>

## Features

- **Code Comprehension:** Understand complex code with natural language explanations.
- **Code Generation:** Generate new code or modify existing files with simple prompts.
- **Test Generation:** Automatically create unit tests for your codebase.
- **Shell Command Execution:** Run shell commands and scripts directly from the assistant.
- **Extensibility:** Compatible with any model that supports the OpenAI-style API.
- **Interactive Environment:** A REPL-like interface for a seamless workflow.

## Getting Started

### Installation

To install CYNE globally, use the following command:

```bash
npm install -g cyne
```

### Usage

Navigate to your project directory and run CYNE:

```bash
cd your-project
cyne
```

## Commands

CYNE supports a variety of slash commands to enhance your workflow:

- `/model`: Select the model you want to use.
- `/config`: Configure the tool to your preferences.
- `/bug`: Report a bug or issue.
- `/help`: Get help with using the tool.

## Examples

### Explaining a function

```
/explain "my_function" in my_file.js
```

### Generating a new component

```
/new "MyComponent" in src/components
```

### Running tests

```
/run_tests
```

## Troubleshooting

If you encounter any issues, try the following:

- Ensure you have a stable internet connection.
- Verify that your API keys are correctly configured.
- Check the CYNE documentation for updates and solutions.

## Contributing

We welcome contributions from the community. If you would like to contribute, please:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Commit your changes and open a pull request.
4.  Ensure your code follows the project's coding standards.

## License

CYNE is licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for more details.
