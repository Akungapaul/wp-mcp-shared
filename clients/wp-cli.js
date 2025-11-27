import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../utils/logger.js';

const execAsync = promisify(exec);

/**
 * WP-CLI Client for advanced WordPress operations
 * Requires WP-CLI to be installed and accessible
 */
export class WPCLIClient {
  constructor(config = {}) {
    this.enabled = config.enabled || process.env.ENABLE_WP_CLI === 'true';
    this.wpCliPath = config.wpCliPath || process.env.WP_CLI_PATH || 'wp';
    this.wordPressPath = config.wordPressPath || process.env.WORDPRESS_PATH || '.';
    this.sshHost = config.sshHost || process.env.SSH_HOST;
    this.sshPort = config.sshPort || process.env.SSH_PORT || '22';
    this.sshUser = config.sshUser || process.env.SSH_USER;
    this.sshKeyPath = config.sshKeyPath || process.env.SSH_KEY_PATH;

    if (this.enabled) {
      logger.info('WP-CLI client enabled');
    } else {
      logger.info('WP-CLI client disabled - enable with ENABLE_WP_CLI=true');
    }
  }

  /**
   * Check if WP-CLI is available
   */
  async isAvailable() {
    if (!this.enabled) return false;

    try {
      await this.exec('--version', { format: null });
      return true;
    } catch (error) {
      logger.warn('WP-CLI not available:', error.message);
      return false;
    }
  }

  /**
   * Execute WP-CLI command
   */
  async exec(command, options = {}) {
    if (!this.enabled) {
      throw new Error('WP-CLI is not enabled. Set ENABLE_WP_CLI=true to use WP-CLI features.');
    }

    const format = options.format || 'json';
    const fullCommand = this.buildCommand(command, format);

    logger.debug(`Executing WP-CLI: ${fullCommand}`);

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: options.timeout || 60000,
        shell: '/bin/bash',
        env: process.env
      });

      if (stderr && !stderr.includes('Warning')) {
        logger.warn('WP-CLI stderr:', stderr);
      }

      if (format === 'json' && stdout.trim()) {
        try {
          return JSON.parse(stdout);
        } catch (e) {
          logger.warn('Failed to parse JSON output, returning raw string');
          return stdout.trim();
        }
      }

      return stdout.trim();
    } catch (error) {
      logger.error('WP-CLI execution failed:', {
        message: error.message,
        code: error.code,
        stdout: error.stdout,
        stderr: error.stderr,
        command: fullCommand
      });
      throw new Error(`WP-CLI command failed: ${error.message}\nStderr: ${error.stderr}\nStdout: ${error.stdout}`);
    }
  }

  /**
   * Build full WP-CLI command with SSH support
   */
  buildCommand(command, format = 'json') {
    let cmd = `${this.wpCliPath} ${command}`;

    if (format && format !== null && !command.includes('--format')) {
      cmd += ` --format=${format}`;
    }

    if (this.wordPressPath && this.wordPressPath !== '.' && !this.sshHost) {
      cmd += ` --path=${this.wordPressPath}`;
    }

    if (this.sshHost) {
      const sshOpts = this.sshKeyPath ? `-i ${this.sshKeyPath}` : '';
      const port = this.sshPort && this.sshPort !== '22' ? `-p ${this.sshPort}` : '';
      const user = this.sshUser || 'root';
      const pathPrefix = this.wordPressPath && this.wordPressPath !== '.' ? `cd ${this.wordPressPath} && ` : '';
      cmd = `ssh ${port} ${sshOpts} ${user}@${this.sshHost} "${pathPrefix}${cmd}"`;
    }

    return cmd;
  }

  // Database operations
  async dbQuery(sql) {
    return this.exec(`db query "${sql.replace(/"/g, '\\"')}"`, { format: 'table' });
  }

  async dbExport(file) {
    return this.exec(`db export ${file}`, { format: null });
  }

  async dbImport(file) {
    return this.exec(`db import ${file}`, { format: null });
  }

  async dbOptimize() {
    return this.exec('db optimize', { format: null });
  }

  async searchReplace(search, replace, tables = []) {
    const tableArgs = tables.length > 0 ? tables.join(' ') : '--all-tables';
    return this.exec(`search-replace "${search}" "${replace}" ${tableArgs}`);
  }

  // Cache operations
  async cacheFlush() {
    return this.exec('cache flush');
  }

  // Theme operations
  async installTheme(theme, activate = false) {
    const activateFlag = activate ? '--activate' : '';
    return this.exec(`theme install ${theme} ${activateFlag}`);
  }

  async activateTheme(theme) {
    return this.exec(`theme activate ${theme}`);
  }

  async deleteTheme(theme) {
    return this.exec(`theme delete ${theme}`);
  }

  async listThemes() {
    return this.exec('theme list');
  }

  // Plugin operations
  async installPlugin(plugin, activate = false) {
    const activateFlag = activate ? '--activate' : '';
    return this.exec(`plugin install ${plugin} ${activateFlag}`);
  }

  async activatePlugin(plugin) {
    return this.exec(`plugin activate ${plugin}`);
  }

  async deactivatePlugin(plugin) {
    return this.exec(`plugin deactivate ${plugin}`);
  }

  async deletePlugin(plugin) {
    return this.exec(`plugin delete ${plugin}`);
  }

  async updatePlugin(plugin = 'all') {
    return this.exec(`plugin update ${plugin}`);
  }

  async listPlugins() {
    return this.exec('plugin list');
  }

  // Core operations
  async coreUpdate() {
    return this.exec('core update');
  }

  async coreVersion() {
    return this.exec('core version', { format: null });
  }

  // User operations
  async createUser(username, email, options = {}) {
    const role = options.role || 'subscriber';
    const password = options.password || '';
    const displayName = options.displayName ? `--display_name="${options.displayName}"` : '';
    return this.exec(`user create ${username} ${email} --role=${role} ${displayName} ${password ? `--user_pass="${password}"` : ''}`);
  }

  async deleteUser(userId, reassign = null) {
    const reassignFlag = reassign ? `--reassign=${reassign}` : '';
    return this.exec(`user delete ${userId} ${reassignFlag}`);
  }

  async listUsers() {
    return this.exec('user list');
  }

  // Maintenance operations
  async enableMaintenanceMode() {
    return this.exec('maintenance-mode activate', { format: null });
  }

  async disableMaintenanceMode() {
    return this.exec('maintenance-mode deactivate', { format: null });
  }

  // Site operations
  async getOption(optionName) {
    return this.exec(`option get ${optionName}`, { format: null });
  }

  async setOption(optionName, value) {
    return this.exec(`option update ${optionName} "${value}"`, { format: null });
  }

  // Media operations
  async regenerateThumbnails() {
    return this.exec('media regenerate --yes');
  }

  async importMedia(url) {
    return this.exec(`media import ${url}`);
  }

  // Export/Import
  async exportContent(dir) {
    return this.exec(`export --dir=${dir}`, { format: null });
  }

  async importContent(file) {
    return this.exec(`import ${file}`, { format: null });
  }

  // Rewrite rules
  async flushRewrite() {
    return this.exec('rewrite flush');
  }
}

export default WPCLIClient;
