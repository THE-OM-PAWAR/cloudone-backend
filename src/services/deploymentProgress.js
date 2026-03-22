class DeploymentProgress {
  constructor(io, deploymentId) {
    this.io = io;
    this.deploymentId = deploymentId;
    this.currentStep = 0;
    this.totalSteps = 12;
    this.logs = [];
  }

  emit(event, data) {
    this.io.emit(`deployment:${this.deploymentId}`, {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  log(message, type = 'info') {
    const logEntry = {
      message,
      type,
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(logEntry);
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    this.emit('log', logEntry);
  }

  step(stepName, description) {
    this.currentStep++;
    const stepData = {
      step: this.currentStep,
      total: this.totalSteps,
      name: stepName,
      description,
      progress: Math.round((this.currentStep / this.totalSteps) * 100)
    };
    
    this.log(`🔄 STEP ${this.currentStep}: ${stepName}`, 'step');
    this.emit('step', stepData);
  }

  success(message, data = {}) {
    this.log(`✅ ${message}`, 'success');
    this.emit('success', { message, ...data });
  }

  error(message, details = null) {
    this.log(`❌ ${message}`, 'error');
    this.emit('error', { 
      message, 
      details,
      logs: this.logs.slice(-10) // Last 10 log entries for context
    });
  }

  warning(message) {
    this.log(`⚠️ ${message}`, 'warning');
    this.emit('warning', { message });
  }

  info(message) {
    this.log(`ℹ️ ${message}`, 'info');
  }

  complete(result) {
    this.emit('complete', {
      result,
      logs: this.logs,
      duration: Date.now() - this.startTime
    });
  }

  start() {
    this.startTime = Date.now();
    this.emit('start', {
      deploymentId: this.deploymentId,
      totalSteps: this.totalSteps
    });
  }
}

module.exports = DeploymentProgress;