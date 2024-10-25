import { jest } from '@jest/globals';
import fetchMock from 'jest-fetch-mock';

import {
  initMap,
  cleanAddress,
  getCoordinates,
  addMarkerToMap,
  handleMarkerClick,
  updateSelectedAddresses,
  checkAndGenerateUrl,
  handleCSVUpload,
  handleImageUpload,
  processCSVData,
  processRecognizedText,
  showFileInput,
  showMapAndControls,
  displayanimation,
  generateGoogleMapsUrl,
  undoSelection,
  validateList,
  mergeArray,
} from './script';

describe('Map Functionality', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    document.body.innerHTML = `
      <div id="map"></div>
      <div id="menuContainer"></div>
      <div id="fileInputs">
        <input id="csvFileInput" type="file" />
        <input id="imageFileInput" type="file" />
      </div>
      <div id="mapContainer"></div>
      <div id="addressTableContainer"></div>
      <button id="undoButton"></button>
      <button id="validateListButton"></button>
      <button id="restartButton"></button>
    `;
  });
});
