class Scheduler {
  constructor() {
    this.tasks = [];
    this.maxTaskLength = 2;
  }

  createTask(fn, expirationTime) {
    return {
      payload: fn,
      next: null,
      prev: null,
      expirationTime,
      queueLength: 0,
      tasksIndex: -1,
    };
  }

  append(fn, expirationTime) {
    const task = this.createTask(fn, expirationTime);
    if (this.tasks.length < this.maxTaskLength) {
      task.tasksIndex = this.tasks.length;
      this.tasks.push(task);
      this.next(task);
    } else {
      const [firstTask, lastTask] = this.tasks;
      if (firstTask.queueLength < lastTask.queueLength) {
        task.tasksIndex = firstTask.tasksIndex;
        this.appendToQueue(firstTask, task);
      } else {
        task.tasksIndex = lastTask.tasksIndex;
        this.appendToQueue(lastTask, task);
      }
    }
  }

  appendToQueue(firstTask, nextTask) {

  }

  next(task) {
    setTimeout(async () => {
      task.fn && task.fn();

    }, task.expirationTime);
  }
}