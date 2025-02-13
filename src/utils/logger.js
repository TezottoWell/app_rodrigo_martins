import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

class Logger {
  static LOG_LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
  };

  static isProduction = !__DEV__;
  static logQueue = [];
  static maxQueueSize = 100;

  static async saveLog(logEntry) {
    if (Platform.OS === 'web') return;

    try {
      const logDir = `${FileSystem.documentDirectory}logs/`;
      const today = new Date().toISOString().split('T')[0];
      const logFile = `${logDir}app-${today}.log`;

      // Criar diretório de logs se não existir
      const dirInfo = await FileSystem.getInfoAsync(logDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(logDir, { intermediates: true });
      }

      // Adicionar log à fila
      this.logQueue.push(logEntry);

      // Se a fila atingir o tamanho máximo, salvar logs
      if (this.logQueue.length >= this.maxQueueSize) {
        const logsToWrite = this.logQueue.join('\n') + '\n';
        await FileSystem.writeAsStringAsync(logFile, logsToWrite, { encoding: FileSystem.EncodingType.UTF8 });
        this.logQueue = [];
      }
    } catch (error) {
      // Fallback para console em caso de erro
      console.error('Erro ao salvar log:', error);
    }
  }

  static formatLog(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(context).length ? JSON.stringify(context) : '';
    return `[${timestamp}] [${level}] ${message} ${contextStr}`;
  }

  static debug(message, context = {}) {
    if (!this.isProduction) {
      const logEntry = this.formatLog(this.LOG_LEVELS.DEBUG, message, context);
      console.debug(logEntry);
      this.saveLog(logEntry);
    }
  }

  static info(message, context = {}) {
    const logEntry = this.formatLog(this.LOG_LEVELS.INFO, message, context);
    if (!this.isProduction) {
      console.info(logEntry);
    }
    this.saveLog(logEntry);
  }

  static warn(message, context = {}) {
    const logEntry = this.formatLog(this.LOG_LEVELS.WARN, message, context);
    if (!this.isProduction) {
      console.warn(logEntry);
    }
    this.saveLog(logEntry);
  }

  static error(message, error, context = {}) {
    const errorContext = {
      ...context,
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: error?.stack
    };
    
    const logEntry = this.formatLog(this.LOG_LEVELS.ERROR, message, errorContext);
    if (!this.isProduction) {
      console.error(logEntry);
    }
    this.saveLog(logEntry);
  }

  static async clearOldLogs(daysToKeep = 7) {
    if (Platform.OS === 'web') return;

    try {
      const logDir = `${FileSystem.documentDirectory}logs/`;
      const dirInfo = await FileSystem.getInfoAsync(logDir);
      
      if (!dirInfo.exists) return;

      const files = await FileSystem.readDirectoryAsync(logDir);
      const now = new Date();
      
      for (const file of files) {
        if (!file.startsWith('app-') || !file.endsWith('.log')) continue;
        
        const dateStr = file.replace('app-', '').replace('.log', '');
        const fileDate = new Date(dateStr);
        const diffDays = (now - fileDate) / (1000 * 60 * 60 * 24);
        
        if (diffDays > daysToKeep) {
          await FileSystem.deleteAsync(`${logDir}${file}`);
        }
      }
    } catch (error) {
      console.error('Erro ao limpar logs antigos:', error);
    }
  }
}

export default Logger; 