// Product configuration management system
interface ProductConfiguration {
  name: string
  repositoryUrl: string
  projectConfigFile: string
  commandName: string
  configurationDirectory: string
  configurationFile: string
  issuesRepositoryUrl: string
  brandingLogo: string
}

class ProductConfigurationManager {
  private static readonly CONFIG: ProductConfiguration = {
    name: "Cyne",
    repositoryUrl: 'https://github.com/CYNERZA/cyne',
    projectConfigFile: 'CYNE.md',
    commandName: 'cyne',
    configurationDirectory: '.cyne',
    configurationFile: '.cyne.json',
    issuesRepositoryUrl: 'https://github.com/CYNERZA/cyne/issues',
    brandingLogo: `
 ██████╗██╗   ██╗███╗   ██╗███████╗
██╔════╝╚██╗ ██╔╝████╗  ██║██╔════╝
██║      ╚████╔╝ ██╔██╗ ██║█████╗  
██║       ╚██╔╝  ██║╚██╗██║██╔══╝  
╚██████╗   ██║   ██║ ╚████║███████╗
 ╚═════╝   ╚═╝   ╚═╝  ╚═══╝╚══════╝`
  }

  static getProductName(): string {
    return this.CONFIG.name
  }

  static getRepositoryUrl(): string {
    return this.CONFIG.repositoryUrl
  }

  static getProjectConfigFile(): string {
    return this.CONFIG.projectConfigFile
  }

  static getCommandName(): string {
    return this.CONFIG.commandName
  }

  static getConfigurationDirectory(): string {
    return this.CONFIG.configurationDirectory
  }

  static getConfigurationFile(): string {
    return this.CONFIG.configurationFile
  }

  static getIssuesUrl(): string {
    return this.CONFIG.issuesRepositoryUrl
  }

  static getBrandingLogo(): string {
    return this.CONFIG.brandingLogo
  }
}

// Legacy exports for backward compatibility
export const PRODUCT_NAME = ProductConfigurationManager.getProductName()
export const PRODUCT_URL = ProductConfigurationManager.getRepositoryUrl()
export const PROJECT_FILE = ProductConfigurationManager.getProjectConfigFile()
export const PRODUCT_COMMAND = ProductConfigurationManager.getCommandName()
export const CONFIG_BASE_DIR = ProductConfigurationManager.getConfigurationDirectory()
export const CONFIG_FILE = ProductConfigurationManager.getConfigurationFile()
export const GITHUB_ISSUES_REPO_URL = ProductConfigurationManager.getIssuesUrl()
export const ASCII_LOGO = ProductConfigurationManager.getBrandingLogo()

export { ProductConfigurationManager }
