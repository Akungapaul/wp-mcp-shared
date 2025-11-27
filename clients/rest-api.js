import axios from 'axios';
import logger from '../utils/logger.js';
import cache from '../utils/cache.js';

/**
 * WordPress REST API Client
 * Handles all HTTP requests to WordPress REST API with authentication
 */
export class WordPressRestClient {
  constructor(config) {
    this.baseUrl = config.url?.replace(/\/$/, '') || process.env.WORDPRESS_URL?.replace(/\/$/, '');
    this.username = config.username || process.env.WORDPRESS_USERNAME;
    this.appPassword = config.appPassword || process.env.WORDPRESS_APP_PASSWORD;

    if (!this.baseUrl) {
      throw new Error('WordPress URL is required');
    }

    if (!this.username || !this.appPassword) {
      throw new Error('WordPress username and application password are required');
    }

    // Create axios instance with authentication
    this.client = axios.create({
      baseURL: `${this.baseUrl}/wp-json`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      auth: {
        username: this.username,
        password: this.appPassword.replace(/\s/g, '')
      },
      timeout: 30000
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(`API Error: ${error.response.status} ${error.response.data?.message || error.message}`);
        } else {
          logger.error(`API Error: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );

    logger.info(`WordPress REST API client initialized: ${this.baseUrl}`);
  }

  /**
   * Generic GET request with caching
   */
  async get(endpoint, params = {}, useCache = true) {
    const cacheKey = `GET:${endpoint}:${JSON.stringify(params)}`;

    if (useCache) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await this.client.get(endpoint, { params });
      const data = response.data;

      if (useCache) {
        cache.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generic POST request
   */
  async post(endpoint, data = {}) {
    try {
      const response = await this.client.post(endpoint, data);
      cache.invalidatePattern(endpoint.split('/')[0]);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generic PUT/PATCH request
   */
  async put(endpoint, data = {}) {
    try {
      const response = await this.client.put(endpoint, data);
      cache.invalidatePattern(endpoint.split('/')[0]);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generic DELETE request
   */
  async delete(endpoint, params = {}) {
    try {
      const response = await this.client.delete(endpoint, { params });
      cache.invalidatePattern(endpoint.split('/')[0]);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Posts
   */
  async getPosts(params = {}) {
    return this.get('/wp/v2/posts', params);
  }

  async getPost(id) {
    return this.get(`/wp/v2/posts/${id}`);
  }

  async createPost(data) {
    return this.post('/wp/v2/posts', data);
  }

  async updatePost(id, data) {
    return this.put(`/wp/v2/posts/${id}`, data);
  }

  async deletePost(id, force = false) {
    return this.delete(`/wp/v2/posts/${id}`, { force });
  }

  /**
   * Pages
   */
  async getPages(params = {}) {
    return this.get('/wp/v2/pages', params);
  }

  async getPage(id) {
    return this.get(`/wp/v2/pages/${id}`);
  }

  async createPage(data) {
    return this.post('/wp/v2/pages', data);
  }

  async updatePage(id, data) {
    return this.put(`/wp/v2/pages/${id}`, data);
  }

  async deletePage(id, force = false) {
    return this.delete(`/wp/v2/pages/${id}`, { force });
  }

  /**
   * Media
   */
  async getMedia(params = {}) {
    return this.get('/wp/v2/media', params);
  }

  async getMediaItem(id) {
    return this.get(`/wp/v2/media/${id}`);
  }

  async uploadMedia(fileData, filename, mimeType) {
    try {
      const response = await this.client.post('/wp/v2/media', fileData, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
      cache.invalidatePattern('media');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateMedia(id, data) {
    return this.put(`/wp/v2/media/${id}`, data);
  }

  async deleteMedia(id, force = false) {
    return this.delete(`/wp/v2/media/${id}`, { force });
  }

  /**
   * Categories
   */
  async getCategories(params = {}) {
    return this.get('/wp/v2/categories', params);
  }

  async createCategory(data) {
    return this.post('/wp/v2/categories', data);
  }

  async updateCategory(id, data) {
    return this.put(`/wp/v2/categories/${id}`, data);
  }

  async deleteCategory(id, force = false) {
    return this.delete(`/wp/v2/categories/${id}`, { force });
  }

  /**
   * Tags
   */
  async getTags(params = {}) {
    return this.get('/wp/v2/tags', params);
  }

  async createTag(data) {
    return this.post('/wp/v2/tags', data);
  }

  async updateTag(id, data) {
    return this.put(`/wp/v2/tags/${id}`, data);
  }

  async deleteTag(id, force = false) {
    return this.delete(`/wp/v2/tags/${id}`, { force });
  }

  /**
   * Users
   */
  async getUsers(params = {}) {
    return this.get('/wp/v2/users', params);
  }

  async getUser(id) {
    return this.get(`/wp/v2/users/${id}`);
  }

  async getCurrentUser() {
    return this.get('/wp/v2/users/me');
  }

  /**
   * Themes
   */
  async getThemes() {
    return this.get('/wp/v2/themes');
  }

  async getActiveTheme() {
    const themes = await this.getThemes();
    return themes.find(theme => theme.status === 'active');
  }

  /**
   * Plugins
   */
  async getPlugins() {
    return this.get('/wp/v2/plugins');
  }

  async activatePlugin(plugin) {
    return this.put(`/wp/v2/plugins/${plugin}`, { status: 'active' });
  }

  async deactivatePlugin(plugin) {
    return this.put(`/wp/v2/plugins/${plugin}`, { status: 'inactive' });
  }

  /**
   * Settings
   */
  async getSettings() {
    return this.get('/wp/v2/settings');
  }

  async updateSettings(data) {
    return this.post('/wp/v2/settings', data);
  }

  /**
   * Menus
   */
  async getMenus() {
    return this.get('/wp/v2/menus');
  }

  async getMenu(id) {
    return this.get(`/wp/v2/menus/${id}`);
  }

  async createMenu(data) {
    return this.post('/wp/v2/menus', data);
  }

  async updateMenu(id, data) {
    return this.put(`/wp/v2/menus/${id}`, data);
  }

  async deleteMenu(id) {
    return this.delete(`/wp/v2/menus/${id}`);
  }

  /**
   * Menu Items
   */
  async getMenuItems(menuId) {
    return this.get('/wp/v2/menu-items', { menus: menuId });
  }

  async createMenuItem(data) {
    return this.post('/wp/v2/menu-items', data);
  }

  async updateMenuItem(id, data) {
    return this.put(`/wp/v2/menu-items/${id}`, data);
  }

  async deleteMenuItem(id) {
    return this.delete(`/wp/v2/menu-items/${id}`);
  }

  /**
   * Block Patterns
   */
  async getBlockPatterns() {
    return this.get('/wp/v2/block-patterns/patterns');
  }

  /**
   * Reusable Blocks
   */
  async getReusableBlocks() {
    return this.get('/wp/v2/blocks');
  }

  async createReusableBlock(data) {
    return this.post('/wp/v2/blocks', data);
  }

  /**
   * Search
   */
  async search(query, params = {}) {
    return this.get('/wp/v2/search', { search: query, ...params });
  }

  /**
   * Error handler
   */
  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.error || error.message;
      return new Error(`WordPress API Error (${status}): ${message}`);
    }

    if (error.request) {
      return new Error('No response from WordPress API. Check your connection and URL.');
    }

    return new Error(`Request failed: ${error.message}`);
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      const user = await this.getCurrentUser();
      logger.info(`Connected to WordPress as: ${user.name} (${user.email})`);
      return { success: true, user };
    } catch (error) {
      logger.error('Connection test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default WordPressRestClient;
