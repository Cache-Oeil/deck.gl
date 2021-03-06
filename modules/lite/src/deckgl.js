/* global window, document */
/* eslint-disable max-statements */
import Mapbox from 'react-map-gl/src/mapbox/mapbox';

import {Deck, OrbitView, MapController, experimental} from '@deck.gl/core';
const {OrbitController} = experimental;

const CANVAS_STYLE = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%'
};

// Add missing props for compatibility
function normalizeProps(props) {
  // Support old "geospatial view state as separate props" style
  if (!props.viewState) {
    const {longitude, latitude, zoom, pitch = 0, bearing = 0} = props;
    props.viewState = {longitude, latitude, zoom, pitch, bearing};
  }
}

// Create canvas elements for map and deck
function createCanvas(props) {
  let {container = document.body} = props;

  if (typeof container === 'string') {
    container = document.getElementById(container);
  }

  if (!container) {
    throw Error('Deck: container not found');
  }

  // Add DOM elements
  const containerStyle = window.getComputedStyle(container);
  if (containerStyle.position === 'static') {
    container.style.position = 'relative';
  }

  const mapCanvas = document.createElement('div');
  container.appendChild(mapCanvas);
  Object.assign(mapCanvas.style, CANVAS_STYLE);

  const deckCanvas = document.createElement('canvas');
  container.appendChild(deckCanvas);
  Object.assign(deckCanvas.style, CANVAS_STYLE);

  return {container, mapCanvas, deckCanvas};
}

/**
 * @params container (Element) - DOM element to add deck.gl canvas to
 * @params map (Object) - map API. Set to falsy to disable
 * @params controller (Object) - Controller class. Leave empty for auto detection
 */
export default class DeckGL extends Deck {
  constructor(props = {}) {
    if (typeof document === 'undefined') {
      // Not browser
      throw Error('Deck can only be used in the browser');
    }

    const {mapCanvas, deckCanvas} = createCanvas(props);

    normalizeProps(props);
    const isMap = Number.isFinite(props.viewState.latitude);
    const isOrbit = props.views && props.views[0] instanceof OrbitView;
    let Controller;
    if (isMap) {
      Controller = MapController;
    } else if (isOrbit) {
      Controller = OrbitController;
    }

    super(
      Object.assign({}, props, {
        width: '100%',
        height: '100%',
        canvas: deckCanvas,
        controller: props.controller || Controller
      })
    );

    const {map = window.mapboxgl} = props;
    if (map && map.Map) {
      // Default create mapbox map
      this._map =
        isMap &&
        new Mapbox(
          Object.assign({}, props, {
            container: mapCanvas,
            mapboxgl: map
          })
        );
    } else {
      this._map = map;
    }

    this._onViewportChange = this._onViewportChange.bind(this);
    this._initialized = true;
  }

  getMapboxMap() {
    return this._map && this._map.getMap();
  }

  finalize() {
    if (this._map) {
      this._map.finalize();
    }

    super.finalize();
  }

  setProps(props) {
    if (this._initialized && props.onViewportChange !== this._onViewportChange) {
      if (props.hasOwnProperty('onViewportChange')) {
        this.onViewportChange = props.onViewportChange;
      }
      props.onViewportChange = this._onViewportChange;
    }

    if (this._map) {
      this._map.setProps(props);
    }

    super.setProps(props);
  }

  _onViewportChange(viewport) {
    const {viewState} = this.props;

    this.setProps({
      viewState: Object.assign({}, viewState, viewport)
    });

    if (this.onViewportChange) {
      this.onViewportChange(viewport);
    }
  }
}
