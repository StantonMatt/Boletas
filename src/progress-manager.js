"use strict";

class ProgressManager {
  constructor() {
    this.startTime = null;
    this.totalPages = 0;
    this.processedPages = 0;
    this.isVisible = false;
    this.currentPhase = "";

    // Get DOM elements
    this.loadingContainer = null;
    this.progressBar = null;
    this.loadingPercentage = null;
    this.loadingStatus = null;
    this.processedCount = null;
    this.totalCount = null;
    this.estimatedTime = null;
    this.generateButton = null;

    // Initialize when DOM is ready
    this.initializeElements();
  }

  initializeElements() {
    // Wait for DOM to be ready
    if (typeof document !== "undefined") {
      this.loadingContainer = document.getElementById("loadingContainer");
      this.progressBar = document.getElementById("progressBar");
      this.loadingPercentage = document.getElementById("loadingPercentage");
      this.loadingStatus = document.getElementById("loadingStatus");
      this.processedCount = document.getElementById("processedCount");
      this.totalCount = document.getElementById("totalCount");
      this.estimatedTime = document.getElementById("estimatedTime");
      this.generateButton = document.getElementById("generateBoletasButton");
    }
  }

  show(totalPages) {
    if (!this.loadingContainer) this.initializeElements();

    this.totalPages = totalPages;
    this.processedPages = 0;
    this.startTime = Date.now();
    this.isVisible = true;

    // Show loading container and disable generate button
    this.loadingContainer.style.display = "block";
    if (this.generateButton) {
      this.generateButton.disabled = true;
      this.generateButton.textContent = "Generating...";
    }

    // Initialize display
    this.updateDisplay(0, "Initializing PDF generation...");

    console.log(`Progress Manager: Starting generation of ${totalPages} pages`);
  }

  updateProgress(processedPages, status = "") {
    if (!this.isVisible) return;

    this.processedPages = Math.min(processedPages, this.totalPages);
    const percentage =
      this.totalPages > 0 ? (this.processedPages / this.totalPages) * 100 : 0;

    this.updateDisplay(percentage, status);

    // Log progress every 10 pages or on phase changes
    if (processedPages % 10 === 0 || status !== this.currentPhase) {
      console.log(
        `Progress: ${processedPages}/${
          this.totalPages
        } pages (${percentage.toFixed(1)}%) - ${status}`
      );
      this.currentPhase = status;
    }
  }

  updatePhase(phase, additionalInfo = "") {
    if (!this.isVisible) return;

    const status = additionalInfo ? `${phase} - ${additionalInfo}` : phase;
    this.updateDisplay(null, status); // null means don't change percentage

    console.log(`Progress Phase: ${status}`);
  }

  updateDisplay(percentage = null, status = "") {
    if (!this.loadingContainer) return;

    // Update percentage if provided
    if (percentage !== null) {
      const roundedPercentage = Math.round(percentage);
      if (this.progressBar) {
        this.progressBar.style.width = `${percentage}%`;
      }
      if (this.loadingPercentage) {
        this.loadingPercentage.textContent = `${roundedPercentage}%`;
      }
    }

    // Update status text
    if (status && this.loadingStatus) {
      this.loadingStatus.textContent = status;
    }

    // Update counters
    if (this.processedCount) {
      this.processedCount.textContent = this.processedPages;
    }
    if (this.totalCount) {
      this.totalCount.textContent = this.totalPages;
    }

    // Calculate and update ETA
    if (this.estimatedTime && this.startTime && this.processedPages > 0) {
      const elapsed = Date.now() - this.startTime;
      const rate = this.processedPages / elapsed; // pages per millisecond
      const remaining = this.totalPages - this.processedPages;
      const eta = remaining / rate; // milliseconds remaining

      if (eta > 0 && eta < Infinity) {
        const etaSeconds = Math.round(eta / 1000);
        const minutes = Math.floor(etaSeconds / 60);
        const seconds = etaSeconds % 60;
        this.estimatedTime.textContent = `${minutes}:${seconds
          .toString()
          .padStart(2, "0")}`;
      } else {
        this.estimatedTime.textContent = "--:--";
      }
    }
  }

  hide() {
    if (!this.loadingContainer) return;

    this.isVisible = false;

    // Hide loading container and re-enable generate button
    this.loadingContainer.style.display = "none";
    if (this.generateButton) {
      this.generateButton.disabled = false;
      this.generateButton.textContent = "Generate Boletas";
    }

    // Calculate total time
    if (this.startTime) {
      const totalTime = Date.now() - this.startTime;
      const minutes = Math.floor(totalTime / 60000);
      const seconds = Math.floor((totalTime % 60000) / 1000);
      console.log(
        `Progress Manager: Generation completed in ${minutes}:${seconds
          .toString()
          .padStart(2, "0")}`
      );
    }

    // Reset values
    this.startTime = null;
    this.totalPages = 0;
    this.processedPages = 0;
    this.currentPhase = "";
  }

  error(errorMessage) {
    console.error(`Progress Manager Error: ${errorMessage}`);

    if (this.loadingStatus) {
      this.loadingStatus.textContent = `Error: ${errorMessage}`;
      this.loadingStatus.style.color = "#ff6b6b";
    }

    // Hide after a delay to show the error
    setTimeout(() => {
      this.hide();
      if (this.loadingStatus) {
        this.loadingStatus.style.color = ""; // Reset color
      }
    }, 3000);
  }
}

// Create singleton instance
const progressManager = new ProgressManager();

export default progressManager;
