import * as THREE from 'three';
import { gsap } from 'gsap';
import axios from 'axios';

class TuttlyApp {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.currentVideoIndex = 0;
        this.videos = [];
        this.categories = [];
        this.currentCategory = null;
        this.streamInfoVisible = true;
        this.favorites = JSON.parse(localStorage.getItem('tuttlyFavorites')) || {
            categories: [],
            streams: []
        };
        
        // Megtekintési előzmények
        this.viewHistory = JSON.parse(localStorage.getItem('tuttlyViewHistory')) || {
            streams: [],
            categories: []
        };

        // Offline mód beállítások
        this.isOffline = !navigator.onLine;
        this.offlineData = JSON.parse(localStorage.getItem('tuttlyOfflineData')) || {
            categories: [],
            streams: []
        };
        
        // Teljesítmény beállítások
        this.connectionSpeed = 'high'; // 'low', 'medium', 'high'
        this.preloadedStreams = new Map();
        this.maxPreloadedStreams = 3;
        this.lastSpeedTest = 0;
        this.speedTestInterval = 60000; // 1 perc
        
        // Twitch API beállítások
        this.clientId = 'lmpb3bh3dnttl2u12nbfdf5e5lsjpq';
        this.clientSecret = '1oqdb1f74rtvz86z9f1rayh4axls6l';
        this.accessToken = null;

        // Stílusok beállítása
        this.setupStyles();
        
        this.init();
    }

    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            body {
                margin: 0;
                padding: 0;
                background: #000000;
                overflow: hidden;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .welcome-text {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 2.5em;
                font-weight: 600;
                text-align: center;
                opacity: 0;
                z-index: 2000;
                animation: welcomeFade 3s ease-in-out forwards;
                text-shadow: 0 0 20px rgba(145, 70, 255, 0.5);
            }

            .app-title {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                color: transparent;
                font-size: 3em;
                font-weight: 800;
                font-family: 'Montserrat', sans-serif;
                text-align: center;
                z-index: 2000;
                opacity: 0;
                transition: opacity 0.5s ease;
                background: linear-gradient(45deg, #9146FF, #FF6B6B);
                background-clip: text;
                -webkit-background-clip: text;
                text-shadow: 0 0 20px rgba(145, 70, 255, 0.3);
                letter-spacing: 2px;
                animation: titleGlow 3s ease-in-out infinite;
            }

            @keyframes titleGlow {
                0% {
                    text-shadow: 0 0 20px rgba(145, 70, 255, 0.3);
                    transform: translateX(-50%) scale(1);
                }
                50% {
                    text-shadow: 0 0 30px rgba(145, 70, 255, 0.8),
                                0 0 50px rgba(145, 70, 255, 0.4),
                                0 0 70px rgba(145, 70, 255, 0.2);
                    transform: translateX(-50%) scale(1.05);
                }
                100% {
                    text-shadow: 0 0 20px rgba(145, 70, 255, 0.3);
                    transform: translateX(-50%) scale(1);
                }
            }

            @font-face {
                font-family: 'Montserrat';
                src: url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap');
            }

            .app-title.visible {
                opacity: 1;
            }

            @keyframes welcomeFade {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -30%);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%);
                }
                80% {
                    opacity: 1;
                    transform: translate(-50%, -50%);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -70%);
                }
            }

            .stream-container {
                position: fixed;
                top: 50%;
                left: 35%;
                transform: translate(-50%, -50%);
                width: 65vw;
                height: 80vh;
                max-width: 1080px;
                max-height: 720px;
                z-index: 1;
                opacity: 0;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
                transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(145, 70, 255, 0.2);
            }

            .stream-container:fullscreen {
                width: 100vw;
                height: 100vh;
                max-width: none;
                max-height: none;
                border-radius: 0;
            }

            .stream-container:fullscreen .stream-controls {
                bottom: 30px;
                transform: translateX(-50%) scale(1.2);
            }

            .stream-container:fullscreen .stream-quality {
                top: 30px;
                right: 30px;
                transform: scale(1.2);
            }

            .stream-container iframe {
                position: relative;
                z-index: 1;
            }

            .stream-controls {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 15px;
                padding: 12px 24px;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 15px;
                opacity: 0;
                visibility: hidden;
                z-index: 9999;
                pointer-events: auto;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(145, 70, 255, 0.2);
            }

            .stream-container:hover .stream-controls,
            .stream-controls:hover {
                opacity: 1;
                visibility: visible;
            }

            .stream-control-button {
                background: rgba(145, 70, 255, 0.2);
                border: 2px solid rgba(145, 70, 255, 0.5);
                color: white;
                font-size: 24px;
                padding: 10px 15px;
                cursor: pointer;
                border-radius: 12px;
                transition: all 0.3s ease;
                opacity: 0.8;
                z-index: 10000;
                pointer-events: auto;
            }

            .stream-control-button:hover:not(:disabled) {
                opacity: 1;
                transform: scale(1.1);
                background: rgba(145, 70, 255, 0.4);
                box-shadow: 0 4px 15px rgba(145, 70, 255, 0.3);
            }

            .stream-control-button:active:not(:disabled) {
                transform: scale(0.95);
            }

            .stream-control-button:disabled {
                opacity: 0.3;
                cursor: not-allowed;
                transform: none;
                background: rgba(0, 0, 0, 0.3);
            }

            .stream-quality {
                position: absolute;
                top: 20px;
                right: 20px;
                z-index: 3;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
            }

            .stream-title-overlay {
                position: absolute;
                top: 20px;
                left: 20px;
                z-index: 3;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 10px 15px;
                border-radius: 15px;
                font-size: 14px;
                max-width: 300px;
                backdrop-filter: blur(10px);
            }

            .stream-container.visible {
                opacity: 1;
            }

            .chat-container {
                position: fixed;
                top: 50%;
                right: 2%;
                transform: translate(0, -50%);
                width: 25vw;
                height: 80vh;
                max-width: 400px;
                max-height: 720px;
                z-index: 1;
                opacity: 0;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
                transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(145, 70, 255, 0.2);
            }

            .chat-header {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 40px;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 15px;
                z-index: 2;
            }

            .chat-tabs {
                display: flex;
                gap: 15px;
            }

            .chat-tab {
                color: #adadb8;
                font-size: 14px;
                cursor: pointer;
                transition: color 0.2s ease;
            }

            .chat-tab.active {
                color: white;
                font-weight: 500;
            }

            .chat-tab:hover {
                color: white;
            }

            .chat-settings {
                display: flex;
                gap: 10px;
            }

            .chat-setting-button {
                background: none;
                border: none;
                color: #adadb8;
                cursor: pointer;
                font-size: 16px;
                padding: 5px;
                transition: color 0.2s ease;
            }

            .chat-setting-button:hover {
                color: white;
            }

            .chat-frame-container {
                position: absolute;
                top: 40px;
                left: 0;
                right: 0;
                bottom: 0;
                background: transparent;
            }

            @media (max-width: 1200px) {
                .chat-container {
                    width: 30vw;
                    max-width: 350px;
                }
            }

            @media (max-width: 768px) {
                .chat-container {
                    width: 35vw;
                    max-width: 300px;
                }
            }

            @media (max-width: 480px) {
                .chat-container {
                    width: 40vw;
                    max-width: 250px;
                }
            }

            .chat-container.visible {
                opacity: 1;
            }

            .loading-spinner {
                width: 80px;
                height: 80px;
                border: 4px solid rgba(145, 70, 255, 0.1);
                border-left-color: rgba(145, 70, 255, 1);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% {
                    transform: rotate(0deg);
                }
                100% {
                    transform: rotate(360deg);
                }
            }

            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #000;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 20px;
                transition: opacity 0.5s ease;
            }

            .loading-text {
                color: white;
                font-size: 24px;
                margin-top: 20px;
                font-weight: 500;
                text-shadow: 0 0 10px rgba(145, 70, 255, 0.5);
                animation: pulse 1.8s ease-in-out infinite;
            }

            @keyframes pulse {
                0% {
                    transform: scale(0.6);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.2);
                    opacity: 0.5;
                }
                100% {
                    transform: scale(0.6);
                    opacity: 1;
                }
            }

            .categories-container {
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                flex-wrap: wrap;
                gap: 30px;
                z-index: 2000;
                opacity: 0;
                transition: opacity 0.5s ease;
                max-width: 95vw;
                padding: 30px;
                max-height: 85vh;
                overflow-y: auto;
                overflow-x: hidden;
                scrollbar-width: thin;
                scrollbar-color: rgba(145, 70, 255, 0.5) rgba(0, 0, 0, 0.2);
                justify-content: center;
                background: rgba(0, 0, 0, 0.5);
                border-radius: 20px;
                backdrop-filter: blur(10px);
            }

            .categories-container.visible {
                opacity: 1;
            }

            .category-card {
                background: rgba(145, 70, 255, 0.1);
                border: 2px solid rgba(145, 70, 255, 0.3);
                border-radius: 20px;
                padding: 25px;
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
                text-align: center;
                min-height: 180px;
                box-shadow: 0 4px 15px rgba(145, 70, 255, 0.1);
                width: 220px;
                flex: 0 0 auto;
                opacity: 1;
                visibility: visible;
            }

            .category-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 25px rgba(145, 70, 255, 0.2);
                border-color: rgba(145, 70, 255, 0.5);
            }

            .category-image {
                width: 140px;
                height: 140px;
                border-radius: 15px;
                object-fit: cover;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                transition: transform 0.3s ease;
            }

            .category-info {
                display: flex;
                flex-direction: column;
                gap: 5px;
                width: 100%;
            }

            .category-name {
                color: white;
                font-size: 16px;
                font-weight: 600;
                margin: 0;
                word-break: break-word;
            }

            .category-streamer {
                color: #adadb8;
                font-size: 14px;
                margin: 0;
                word-break: break-word;
            }

            @media (max-width: 768px) {
                .categories-container {
                    padding: 20px;
                    gap: 20px;
                }

                .category-card {
                    width: 160px;
                    padding: 15px;
                    min-height: 160px;
                }

                .category-image {
                    width: 100px;
                    height: 100px;
                }
            }

            .back-button {
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 2000;
                background: rgba(145, 70, 255, 0.2);
                border: 2px solid rgba(145, 70, 255, 0.5);
                color: white;
                padding: 12px 24px;
                border-radius: 15px;
                cursor: pointer;
                font-size: 16px;
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 15px rgba(145, 70, 255, 0.1);
            }

            .back-button:hover {
                background: rgba(145, 70, 255, 0.4);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(145, 70, 255, 0.3);
            }

            .back-button.visible {
                opacity: 1;
                transform: translateX(0);
            }

            .stream-info {
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                z-index: 2000;
                opacity: 0;
                transition: opacity 0.3s ease;
                backdrop-filter: blur(10px);
                cursor: pointer;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .stream-info-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
            }

            .stream-info-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 18px;
                padding: 0 5px;
                opacity: 0.7;
                transition: opacity 0.2s ease;
            }

            .stream-info-close:hover {
                opacity: 1;
            }

            .stream-info-content {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .stream-info.visible {
                opacity: 1;
            }

            .streams-container {
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                width: 90vw;
                max-width: 1200px;
                z-index: 2000;
                opacity: 0;
                transition: opacity 0.5s ease;
                max-height: 80vh;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: rgba(145, 70, 255, 0.5) rgba(0, 0, 0, 0.2);
            }

            .stream-filters {
                padding: 20px;
                display: flex;
                gap: 15px;
                align-items: center;
                background: rgba(0, 0, 0, 0.4);
                border-radius: 15px;
                margin-bottom: 20px;
            }

            .stream-search {
                flex: 1;
                padding: 12px 20px;
                font-size: 16px;
                border: 2px solid rgba(145, 70, 255, 0.3);
                border-radius: 25px;
                background: rgba(0, 0, 0, 0.4);
                color: white;
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
            }

            .stream-search:focus {
                outline: none;
                border-color: rgba(145, 70, 255, 0.8);
                box-shadow: 0 0 15px rgba(145, 70, 255, 0.3);
            }

            .stream-search::placeholder {
                color: rgba(255, 255, 255, 0.5);
            }

            .stream-language-select {
                padding: 12px 20px;
                font-size: 16px;
                border: 2px solid rgba(145, 70, 255, 0.3);
                border-radius: 25px;
                background: rgba(0, 0, 0, 0.4);
                color: white;
                backdrop-filter: blur(10px);
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 120px;
            }

            .stream-language-select:focus {
                outline: none;
                border-color: rgba(145, 70, 255, 0.8);
                box-shadow: 0 0 15px rgba(145, 70, 255, 0.3);
            }

            .stream-language-select option {
                background: rgba(0, 0, 0, 0.9);
                color: white;
            }

            .streams-container::-webkit-scrollbar {
                width: 8px;
            }

            .streams-container::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
            }

            .streams-container::-webkit-scrollbar-thumb {
                background: rgba(145, 70, 255, 0.5);
                border-radius: 4px;
            }

            .streams-container::-webkit-scrollbar-thumb:hover {
                background: rgba(145, 70, 255, 0.7);
            }

            .streams-container.visible {
                opacity: 1;
            }

            .category-header {
                padding: 20px;
                margin-bottom: 20px;
            }

            .category-header h2 {
                color: white;
                font-size: 24px;
                font-weight: 600;
                margin: 0;
                text-shadow: 0 0 10px rgba(145, 70, 255, 0.3);
            }

            .streams-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
                padding: 0 20px;
            }

            .stream-card {
                background: rgba(0, 0, 0, 0.4);
                border-radius: 15px;
                overflow: hidden;
                cursor: pointer;
                transition: all 0.3s ease;
                width: 100%;
                border: 2px solid rgba(145, 70, 255, 0.2);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            }

            .stream-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 25px rgba(145, 70, 255, 0.3);
                border-color: rgba(145, 70, 255, 0.5);
            }

            .stream-card-info {
                padding: 15px;
                background: rgba(0, 0, 0, 0.4);
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .stream-card-user {
                font-size: 16px;
                color: #ffffff;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                transition: color 0.2s ease;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .stream-card-title {
                font-size: 14px;
                color: #adadb8;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                word-break: break-word;
                line-height: 1.4;
            }

            .stream-thumbnail {
                width: 100%;
                aspect-ratio: 16/9;
                position: relative;
                overflow: hidden;
            }

            .stream-thumbnail img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s ease;
            }

            .stream-card:hover .stream-thumbnail img {
                transform: scale(1.05);
            }

            .live-indicator {
                position: absolute;
                top: 10px;
                left: 10px;
                background: linear-gradient(45deg, #eb0400, #ff6b6b);
                color: white;
                padding: 4px 8px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                box-shadow: 0 2px 8px rgba(235, 4, 0, 0.3);
            }

            .viewer-count {
                position: absolute;
                bottom: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 4px;
                backdrop-filter: blur(5px);
            }

            .viewer-count::before {
                content: "•";
                color: #eb0400;
                font-size: 20px;
                line-height: 0;
                margin-right: 2px;
            }

            .stream-tags {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            }

            .tag {
                background: rgba(255, 255, 255, 0.08);
                color: #adadb8;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                white-space: nowrap;
            }

            .load-more {
                display: flex;
                justify-content: center;
                padding: 30px 0;
            }

            .load-more-button {
                background: rgba(145, 70, 255, 0.2);
                border: 2px solid rgba(145, 70, 255, 0.5);
                color: white;
                padding: 12px 24px;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
            }

            .load-more-button:hover {
                background: rgba(145, 70, 255, 0.4);
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(145, 70, 255, 0.3);
            }

            .load-more-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }

            .load-more-button:active:not(:disabled) {
                transform: translateY(0);
            }

            #quality, #fullscreen {
                font-size: 20px;
            }

            .footer {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                padding: 15px 20px;
                background: rgba(0, 0, 0, 0.85);
                color: rgba(255, 255, 255, 0.7);
                text-align: center;
                font-size: 14px;
                backdrop-filter: blur(10px);
                z-index: 9999;
                border-top: 1px solid rgba(145, 70, 255, 0.2);
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 20px;
                transition: all 0.3s ease;
            }

            .footer:hover {
                background: rgba(0, 0, 0, 0.95);
                border-top-color: rgba(145, 70, 255, 0.4);
            }

            .footer span {
                color: #9146FF;
                font-weight: 600;
                text-shadow: 0 0 10px rgba(145, 70, 255, 0.3);
                transition: all 0.3s ease;
            }

            .footer:hover span {
                text-shadow: 0 0 15px rgba(145, 70, 255, 0.5);
            }

            .privacy-link {
                color: rgba(255, 255, 255, 0.7);
                text-decoration: none;
                transition: all 0.3s ease;
                padding: 5px 10px;
                border-radius: 15px;
                background: rgba(145, 70, 255, 0.1);
                border: 1px solid rgba(145, 70, 255, 0.2);
            }

            .privacy-link:hover {
                color: #9146FF;
                background: rgba(145, 70, 255, 0.2);
                border-color: rgba(145, 70, 255, 0.4);
                transform: translateY(-2px);
            }

            @media (max-width: 768px) {
                .footer {
                    flex-direction: column;
                    gap: 10px;
                    padding: 10px;
                    font-size: 12px;
                }

                .privacy-link {
                    padding: 4px 8px;
                }
            }

            .privacy-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 2999;
                opacity: 0;
                transition: opacity 0.3s ease;
                backdrop-filter: blur(5px);
            }

            .privacy-overlay.visible {
                opacity: 1;
            }

            .privacy-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80%;
                max-width: 600px;
                max-height: 80vh;
                background: rgba(0, 0, 0, 0.95);
                border-radius: 20px;
                padding: 20px;
                color: #fff;
                font-family: 'Montserrat', sans-serif;
                opacity: 0;
                transition: opacity 0.3s ease;
                z-index: 3000;
                overflow-y: auto;
                box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(145, 70, 255, 0.2);
            }

            .privacy-container.visible {
                opacity: 1;
            }

            .privacy-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(145, 70, 255, 0.2);
            }

            .privacy-header h1 {
                margin: 0;
                font-size: 24px;
                color: #9146FF;
                text-shadow: 0 0 10px rgba(145, 70, 255, 0.3);
            }

            .privacy-close {
                background: none;
                border: none;
                color: #fff;
                font-size: 32px;
                cursor: pointer;
                padding: 0 10px;
                transition: all 0.3s ease;
            }

            .privacy-close:hover {
                color: #9146FF;
                transform: scale(1.1);
            }

            .privacy-content {
                padding: 5px 0;
            }

            .privacy-content h2 {
                color: #9146FF;
                margin-top: 15px;
                margin-bottom: 10px;
                font-size: 18px;
                text-shadow: 0 0 10px rgba(145, 70, 255, 0.2);
            }

            .privacy-content p {
                line-height: 1.6;
                margin-bottom: 15px;
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
            }

            .privacy-content ul {
                list-style-type: none;
                padding-left: 15px;
            }

            .privacy-content li {
                margin-bottom: 8px;
                position: relative;
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
            }

            .privacy-content li:before {
                content: "•";
                color: #9146FF;
                position: absolute;
                left: -15px;
                font-size: 16px;
            }

            @media (max-width: 768px) {
                .privacy-container {
                    width: 90%;
                    padding: 15px;
                    font-size: 13px;
                }

                .privacy-header h1 {
                    font-size: 20px;
                }

                .privacy-content h2 {
                    font-size: 16px;
                }

                .privacy-content p,
                .privacy-content li {
                    font-size: 13px;
                }
            }

            .favorites-button {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 2000;
                background: rgba(145, 70, 255, 0.2);
                border: 2px solid rgba(145, 70, 255, 0.5);
                color: white;
                padding: 12px 24px;
                border-radius: 15px;
                cursor: pointer;
                font-size: 16px;
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 15px rgba(145, 70, 255, 0.1);
            }

            .favorites-button:hover {
                background: rgba(145, 70, 255, 0.4);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(145, 70, 255, 0.3);
            }

            .favorites-button.visible {
                opacity: 1;
                transform: translateX(0);
            }

            .favorite-button {
                background: none;
                border: none;
                color: #9146FF;
                cursor: pointer;
                font-size: 20px;
                padding: 5px;
                transition: all 0.3s ease;
                position: absolute;
                top: 10px;
                right: 10px;
                .favorites-section {
                    top: 60px;
                    width: 95%;
                    padding: 15px;
                }

                .favorites-tab {
                    font-size: 14px;
                    padding: 6px 12px;
                }

                .footer {
                    font-size: 12px;
                    padding: 10px;
                }
            }

            /* iOS specifikus stílusok */
            @supports (-webkit-touch-callout: none) {
                .stream-container,
                .chat-container,
                .categories-container,
                .streams-container,
                .privacy-container,
                .favorites-section {
                    -webkit-overflow-scrolling: touch;
                }

                .stream-search,
                .stream-language-select {
                    -webkit-appearance: none;
                    appearance: none;
                }

                /* Notch kezelése */
                @supports (padding-top: env(safe-area-inset-top)) {
                    .app-title {
                        padding-top: env(safe-area-inset-top);
                    }

                    .stream-container {
                        padding-top: env(safe-area-inset-top);
                    }

                    .categories-container {
                        padding-top: calc(env(safe-area-inset-top) + 60px);
                    }
                }
            }

            /* Android specifikus stílusok */
            @supports not (-webkit-touch-callout: none) {
                .stream-search,
                .stream-language-select {
                    background: rgba(0, 0, 0, 0.6);
                }

                ::-webkit-scrollbar {
                    width: 6px;
                }

                ::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.2);
                }

                ::-webkit-scrollbar-thumb {
                    background: rgba(145, 70, 255, 0.5);
                    border-radius: 3px;
                }
            }

            /* Érintés optimalizáció */
            @media (hover: none) {
                .stream-control-button,
                .back-button,
                .favorites-button,
                .category-card,
                .stream-card {
                    cursor: default;
                    -webkit-tap-highlight-color: transparent;
                }

                .stream-control-button:active,
                .back-button:active,
                .favorites-button:active {
                    transform: scale(0.95);
                }

                .category-card:active,
                .stream-card:active {
                    transform: scale(0.98);
                }
            }
        `;
        document.head.appendChild(style);
    }

    async getTwitchAccessToken() {
        try {
            const response = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`);
            this.accessToken = response.data.access_token;
            return this.accessToken;
        } catch (error) {
            throw error;
        }
    }

    async getTwitchCategories() {
        try {
            if (!this.accessToken) {
                await this.getTwitchAccessToken();
            }

            const response = await axios.get('https://api.twitch.tv/helix/games/top', {
                headers: {
                    'Client-ID': this.clientId,
                    'Authorization': `Bearer ${this.accessToken}`
                },
                params: {
                    first: 50
                }
            });

            // Kategóriák lekérése után lekérjük az aktív streamereket is minden kategóriához
            const categories = response.data.data;
            const categoriesWithStreamers = await Promise.all(categories.map(async category => {
                const streamResponse = await axios.get('https://api.twitch.tv/helix/streams', {
                    headers: {
                        'Client-ID': this.clientId,
                        'Authorization': `Bearer ${this.accessToken}`
                    },
                    params: {
                        game_id: category.id,
                        first: 1
                    }
                });

                const topStreamer = streamResponse.data.data[0];
                return {
                    id: category.id,
                    name: category.name,
                    boxArtUrl: category.box_art_url,
                    topStreamer: topStreamer ? topStreamer.user_name : null,
                    viewerCount: topStreamer ? topStreamer.viewer_count : 0
                };
            }));

            this.categories = categoriesWithStreamers;
            return this.categories;
        } catch (error) {
            throw error;
        }
    }

    async fetchStreamsByCategory(categoryId, cursor = null) {
        try {
            if (!this.accessToken) {
                await this.getTwitchAccessToken();
            }

            const params = {
                first: 100,
                game_id: categoryId
            };

            if (cursor) {
                params.after = cursor;
            }

            const response = await axios.get('https://api.twitch.tv/helix/streams', {
                headers: {
                    'Client-ID': this.clientId,
                    'Authorization': `Bearer ${this.accessToken}`
                },
                params: params
            });

            // Streamelők profil adatainak lekérése
            const userIds = response.data.data.map(stream => stream.user_id);
            const usersResponse = await axios.get('https://api.twitch.tv/helix/users', {
                headers: {
                    'Client-ID': this.clientId,
                    'Authorization': `Bearer ${this.accessToken}`
                },
                params: {
                    id: userIds
                }
            });

            const userProfiles = usersResponse.data.data;

            const newVideos = response.data.data.map(stream => {
                const userProfile = userProfiles.find(user => user.id === stream.user_id);
                return {
                url: `https://player.twitch.tv/?channel=${stream.user_login}&parent=${window.location.hostname}`,
                title: stream.title,
                viewerCount: stream.viewer_count,
                    userName: stream.user_name,
                    category: stream.game_name,
                    language: stream.language,
                    profileImageUrl: userProfile.profile_image_url,
                    description: userProfile.description
                };
            });

            if (!cursor) {
                this.videos = newVideos;
            } else {
                this.videos = [...this.videos, ...newVideos];
            }

            return {
                videos: this.videos,
                cursor: response.data.pagination.cursor
            };
        } catch (error) {
            throw error;
        }
    }

    async init() {
        // Meta tag-ek hozzáadása
        const metaTags = [
            { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' },
            { name: 'mobile-web-app-capable', content: 'yes' },
            { name: 'apple-mobile-web-app-capable', content: 'yes' },
            { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
            { name: 'theme-color', content: '#000000' }
        ];

        metaTags.forEach(meta => {
            const metaTag = document.createElement('meta');
            metaTag.name = meta.name;
            metaTag.content = meta.content;
            document.head.appendChild(metaTag);
        });

        // Touch események kezelése
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault(); // Pinch zoom letiltása
            }
        }, { passive: false });

        // Orientációváltás kezelése
        window.addEventListener('orientationchange', () => {
            this.onOrientationChange();
        });

        // Kezdeti töltőképernyő létrehozása
        const initialLoadingOverlay = document.createElement('div');
        initialLoadingOverlay.className = 'loading-overlay';
        initialLoadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Tuttly betöltése...</div>
        `;
        document.body.appendChild(initialLoadingOverlay);

        // Fő tartalom konténer létrehozása
        const mainContent = document.createElement('main');
        mainContent.id = 'main-content';
        document.body.appendChild(mainContent);

        // Állandó Tuttly felirat létrehozása
        const appTitle = document.createElement('div');
        appTitle.className = 'app-title';
        appTitle.textContent = 'Tuttly';
        mainContent.appendChild(appTitle);

        // Footer létrehozása
        const footer = document.createElement('footer');
        footer.className = 'footer';
        footer.innerHTML = `© <span>Tuttly</span> - Minden jog fenntartva ${new Date().getFullYear()} | <a href="#" class="privacy-link">Adatvédelem</a>`;
        
        // Adatvédelmi link eseménykezelő
        const privacyLink = footer.querySelector('.privacy-link');
        privacyLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPrivacyPolicy();
        });
        
        document.body.appendChild(footer);

        // Kategóriák betöltése
        try {
            await this.getTwitchCategories();
            
            // Kategóriák létrehozása
            const categoriesContainer = document.createElement('div');
            categoriesContainer.className = 'categories-container';
            
            this.categories.forEach(category => {
                const card = document.createElement('div');
                card.className = 'category-card';
                card.innerHTML = `
                    <img src="${category.boxArtUrl.replace('{width}', '200').replace('{height}', '200')}" 
                         alt="${category.name}" 
                         class="category-image">
                    <div class="category-info">
                        <div class="category-name">${category.name}</div>
                        ${category.topStreamer ? `
                            <div class="category-streamer">
                                🎮 ${category.topStreamer}
                                <br>
                                👥 ${category.viewerCount.toLocaleString('hu-HU')} néző
                            </div>
                        ` : ''}
                    </div>
                `;
                
                card.addEventListener('click', () => this.selectCategory(category));
                categoriesContainer.appendChild(card);
            });
            
            mainContent.appendChild(categoriesContainer);

            // Töltőképernyő eltüntetése és elemek megjelenítése
        setTimeout(() => {
                initialLoadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    initialLoadingOverlay.remove();
            appTitle.classList.add('visible');
                    categoriesContainer.classList.add('visible');
                }, 500);
            }, 2000);

        } catch (error) {
            console.error('Hiba történt a kategóriák betöltésekor:', error);
        }

        window.addEventListener('resize', () => this.onWindowResize());

        // Csak a navigációs gombok eseménykezelői
        document.addEventListener('click', (e) => {
            if (e.target.id === 'prevVideo') {
                this.prevVideo();
            } else if (e.target.id === 'nextVideo') {
                this.nextVideo();
            }
        });

        this.animate();

        // Offline mód kezelés inicializálása
        this.handleOfflineMode();

        // Ha offline módban vagyunk, használjuk a mentett adatokat
        if (this.isOffline && this.offlineData.categories.length > 0) {
            this.categories = this.offlineData.categories;
            this.videos = this.offlineData.streams;
        } else {
            try {
                await this.getTwitchCategories();
            } catch (error) {
                console.error('Hiba történt a kategóriák betöltésekor:', error);
                // Offline adatok használata hiba esetén
                if (this.offlineData.categories.length > 0) {
                    this.categories = this.offlineData.categories;
                    this.videos = this.offlineData.streams;
                }
            }
        }
    }

    async selectCategory(category) {
        // Aktív kategória kártya frissítése
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.remove('active');
        });
        event.currentTarget.classList.add('active');

        this.currentCategory = category;
        this.currentVideoIndex = 0;
        this.streamInfoVisible = true;
        
        // Kategória menü elrejtése
        const categoriesContainer = document.querySelector('.categories-container');
        if (categoriesContainer) {
            categoriesContainer.style.opacity = '0';
            setTimeout(() => {
                categoriesContainer.style.display = 'none';
            }, 500);
        }
        
        try {
            const result = await this.fetchStreamsByCategory(category.id);
            if (result.videos.length > 0) {
                // Streamelők megjelenítése
                const streamsContainer = document.createElement('div');
                streamsContainer.className = 'streams-container';

                // Home gomb létrehozása
                const backButton = document.createElement('button');
                backButton.className = 'back-button';
                backButton.innerHTML = '🏠 Home';
                backButton.addEventListener('click', () => this.showCategories());
                document.body.appendChild(backButton);
                requestAnimationFrame(() => {
                    backButton.classList.add('visible');
                });

                streamsContainer.innerHTML = `
                    <div class="category-header">
                        <h2>${category.name} - Élő Csatornák</h2>
                    </div>
                    <div class="stream-filters">
                        <input type="text" 
                               class="stream-search" 
                               placeholder="Keresés streamek között...">
                        <select class="stream-language-select">
                            <option value="all">Minden nyelv</option>
                            <option value="hu">Magyar</option>
                            <option value="en">Angol</option>
                            <option value="de">Német</option>
                            <option value="fr">Francia</option>
                            <option value="es">Spanyol</option>
                            <option value="it">Olasz</option>
                            <option value="pl">Lengyel</option>
                            <option value="ru">Orosz</option>
                        </select>
                    </div>
                    <div class="streams-grid">
                        ${result.videos.map((stream, index) => `
                            <div class="stream-card" 
                                 data-index="${index}" 
                                 data-language="${stream.language}" 
                                 data-title="${stream.title}" 
                                 data-username="${stream.userName}">
                                <div class="stream-thumbnail">
                                    <img src="https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.userName.toLowerCase()}-440x248.jpg" 
                                         alt="${stream.title}">
                                    <div class="live-indicator">LIVE</div>
                                    <div class="viewer-count">${stream.viewerCount.toLocaleString('hu-HU')} néző</div>
                                    <button class="favorite-button ${this.favorites.streams.some(s => s.userName === stream.userName) ? 'active' : ''}" 
                                            data-stream-id="${stream.userName}">⭐</button>
                                </div>
                                <div class="stream-card-info">
                                    <div class="stream-card-user">👤 ${stream.userName}</div>
                                    <div class="stream-card-title">${stream.title}</div>
                                    <div class="stream-tags">
                                        <span class="tag">${stream.category}</span>
                                        <span class="tag">${stream.language.toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${result.cursor ? `
                        <div class="load-more">
                            <button class="load-more-button">
                                További streamek betöltése
                            </button>
                        </div>
                    ` : ''}
                `;

                // Keresés és szűrés funkcionalitás
                const searchInput = streamsContainer.querySelector('.stream-search');
                const languageSelect = streamsContainer.querySelector('.stream-language-select');

                const filterStreams = () => {
                    const searchTerm = searchInput.value.toLowerCase();
                    const selectedLanguage = languageSelect.value;

                    streamsContainer.querySelectorAll('.stream-card').forEach(card => {
                        const title = card.dataset.title.toLowerCase();
                        const username = card.dataset.username.toLowerCase();
                        const language = card.dataset.language;

                        const matchesSearch = title.includes(searchTerm) || username.includes(searchTerm);
                        const matchesLanguage = selectedLanguage === 'all' || language === selectedLanguage;

                        card.style.display = matchesSearch && matchesLanguage ? 'block' : 'none';
                    });
                };

                searchInput.addEventListener('input', filterStreams);
                languageSelect.addEventListener('change', filterStreams);

                // Stream kártyák eseménykezelői
                streamsContainer.querySelectorAll('.stream-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const index = parseInt(card.dataset.index);
                        this.currentVideoIndex = index;
                        this.loadVideo(this.videos[index].url);
                        streamsContainer.style.opacity = '0';
                        setTimeout(() => {
                            streamsContainer.remove();
                        }, 500);
                    });
                });

                // "További streamek" gomb eseménykezelője
                const loadMoreButton = streamsContainer.querySelector('.load-more-button');
                if (loadMoreButton) {
                    let currentCursor = result.cursor;
                    
                    loadMoreButton.addEventListener('click', async () => {
                        loadMoreButton.textContent = 'Betöltés...';
                        loadMoreButton.disabled = true;
                        
                        try {
                            const selectedLanguage = languageSelect.value;
                            const moreResults = await this.fetchStreamsByCategory(category.id, currentCursor);
                            const streamsGrid = streamsContainer.querySelector('.streams-grid');
                            
                            // Új stream kártyák hozzáadása
                            const newCards = document.createElement('div');
                            newCards.innerHTML = moreResults.videos.slice(result.videos.length).map((stream, index) => `
                                <div class="stream-card" data-index="${result.videos.length + index}" data-language="${stream.language}" data-title="${stream.title}" data-username="${stream.userName}">
                                    <div class="stream-thumbnail">
                                        <img src="https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.userName.toLowerCase()}-440x248.jpg" alt="${stream.title}">
                                        <div class="live-indicator">LIVE</div>
                                        <div class="viewer-count">${stream.viewerCount.toLocaleString('hu-HU')} néző</div>
                                        <button class="favorite-button ${this.favorites.streams.some(s => s.userName === stream.userName) ? 'active' : ''}" data-stream-id="${stream.userName}">⭐</button>
                                    </div>
                                    <div class="stream-card-info">
                                        <div class="stream-card-user">👤 ${stream.userName}</div>
                                        <div class="stream-card-title">${stream.title}</div>
                                        <div class="stream-tags">
                                            <span class="tag">${stream.category}</span>
                                            <span class="tag">${stream.language.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('');
                            
                            while (newCards.firstChild) {
                                streamsGrid.appendChild(newCards.firstChild);
                            }

                            // Új kártyák eseménykezelőinek hozzáadása
                            const newStreamCards = Array.from(streamsGrid.children).slice(-moreResults.videos.length);
                            newStreamCards.forEach(card => {
                                card.addEventListener('click', () => {
                                    const index = parseInt(card.dataset.index);
                                    this.currentVideoIndex = index;
                                    this.loadVideo(this.videos[index].url);
                                    streamsContainer.style.opacity = '0';
                                    setTimeout(() => {
                                        streamsContainer.remove();
                                    }, 500);
                                });

                                // Szűrés alkalmazása az új kártyákra
                                const language = card.dataset.language;
                                if (selectedLanguage !== 'all' && language !== selectedLanguage) {
                                    card.style.display = 'none';
                                }
                            });

                            // "További streamek" gomb frissítése
                            if (moreResults.cursor) {
                                loadMoreButton.textContent = 'További streamek betöltése';
                                loadMoreButton.disabled = false;
                                currentCursor = moreResults.cursor;
                            } else {
                                loadMoreButton.parentElement.remove();
                            }
                        } catch (error) {
                            console.error('Hiba történt a további streamek betöltésekor:', error);
                            loadMoreButton.textContent = 'Hiba történt, próbáld újra';
                            loadMoreButton.disabled = false;
                        }
                    });
                }

                document.body.appendChild(streamsContainer);
                requestAnimationFrame(() => {
                    streamsContainer.classList.add('visible');
                });
            }
        } catch (error) {
            console.error('Hiba történt:', error);
            this.showNotification('Hiba történt a streamek betöltése közben', 'error');
        }
    }

    async loadVideo(url) {
        return new Promise(async (resolve, reject) => {
            // Régi elemek törlése
            const oldElements = document.querySelectorAll('.stream-container, .loading-overlay, .chat-container, .stream-info, .back-button');
            oldElements.forEach(element => element.remove());
            
            // Loading overlay létrehozása
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">Betöltés...</div>
            `;
            document.body.appendChild(loadingOverlay);

            // Home gomb létrehozása
            const backButton = document.createElement('button');
            backButton.className = 'back-button';
            backButton.innerHTML = '🏠 Home';
            backButton.addEventListener('click', () => this.showCategories());
            document.body.appendChild(backButton);

            // Stream container létrehozása
            const streamContainer = document.createElement('div');
            streamContainer.className = 'stream-container';
            
            // Twitch Player iframe létrehozása
            const iframe = document.createElement('iframe');
            const quality = await this.getQualityBasedOnSpeed();
            iframe.src = `${url}&allowfullscreen=true&muted=false&quality=${quality}`;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.setAttribute('allowfullscreen', 'true');
            streamContainer.appendChild(iframe);

            // Minőség automatikus frissítése
            setInterval(() => this.updateStreamQuality(iframe), this.speedTestInterval);

            // Stream előtöltés indítása
            this.preloadStreams();

            // Előzmények frissítése
            const currentStream = this.videos[this.currentVideoIndex];
            this.addToViewHistory(currentStream, this.currentCategory);

            // Stream kontrollok létrehozása
            const streamControls = document.createElement('div');
            streamControls.className = 'stream-controls';
            streamControls.style.pointerEvents = 'auto';
            streamControls.innerHTML = `
                <button class="stream-control-button" id="prevVideo" title="Előző stream">⏮</button>
                <button class="stream-control-button" id="quality" title="Minőség">⚙️</button>
                <button class="stream-control-button" id="fullscreen" title="Teljes képernyő">⛶</button>
                <button class="stream-control-button" id="nextVideo" title="Következő stream">⏭</button>
            `;
            
            // Navigációs gombok eseménykezelőinek hozzáadása
            const prevButton = streamControls.querySelector('#prevVideo');
            const nextButton = streamControls.querySelector('#nextVideo');
            const qualityButton = streamControls.querySelector('#quality');
            const fullscreenButton = streamControls.querySelector('#fullscreen');

            prevButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.currentVideoIndex > 0) {
                    this.currentVideoIndex--;
                    this.loadVideo(this.videos[this.currentVideoIndex].url);
                }
            });

            nextButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.currentVideoIndex < this.videos.length - 1) {
                    this.currentVideoIndex++;
                    this.loadVideo(this.videos[this.currentVideoIndex].url);
                }
            });

            // Minőség gomb eseménykezelő
            qualityButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const message = {
                    type: 'quality',
                    value: 'chunked'
                };
                iframe.contentWindow.postMessage(message, '*');
            });

            // Teljes képernyő gomb eseménykezelő
            fullscreenButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    streamContainer.requestFullscreen();
                }
            });

            // Gombok állapotának frissítése
            prevButton.disabled = this.currentVideoIndex === 0;
            nextButton.disabled = this.currentVideoIndex === this.videos.length - 1;

            streamContainer.appendChild(streamControls);

            // Stream minőség jelző frissítése
            const qualityIndicator = document.createElement('div');
            qualityIndicator.className = 'stream-quality';
            qualityIndicator.textContent = 'Source';
            streamContainer.appendChild(qualityIndicator);

            // Stream cím overlay
            const currentVideo = this.videos[this.currentVideoIndex];
            const titleOverlay = document.createElement('div');
            titleOverlay.className = 'stream-title-overlay';
            titleOverlay.textContent = currentVideo.title;
            streamContainer.appendChild(titleOverlay);

            // Kedvenc gomb hozzáadása a stream cím overlay-hez
            const favoriteButton = document.createElement('button');
            favoriteButton.className = `favorite-button ${this.favorites.streams.some(s => s.userName === currentVideo.userName) ? 'active' : ''}`;
            favoriteButton.innerHTML = '⭐';
            favoriteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavoriteStream(currentVideo.userName);
                favoriteButton.classList.toggle('active');
            });
            titleOverlay.appendChild(favoriteButton);

            // Chat container létrehozása
            const chatContainer = document.createElement('div');
            chatContainer.className = 'chat-container';
            chatContainer.setAttribute('role', 'complementary');
            chatContainer.setAttribute('aria-label', 'Chat');
            
            // Chat header létrehozása
            const chatHeader = document.createElement('div');
            chatHeader.className = 'chat-header';
            chatHeader.innerHTML = `
                <div class="chat-tabs" role="tablist">
                    <div class="chat-tab active" role="tab" aria-selected="true" tabindex="0">Chat</div>
                    <div class="chat-tab" role="tab" aria-selected="false" tabindex="0">Közösség</div>
                </div>
                <div class="chat-settings">
                    <button class="chat-setting-button focusable" 
                            aria-label="Chat beállítások" 
                            title="Chat beállítások">⚙️</button>
                    <button class="chat-setting-button focusable" 
                            aria-label="Felugró chat" 
                            title="Felugró chat">↗️</button>
                    <button class="chat-setting-button focusable" 
                            aria-label="Chat elrejtése" 
                            title="Chat elrejtése">✕</button>
                </div>
            `;

            // Chat frame konténer
            const chatFrameContainer = document.createElement('div');
            chatFrameContainer.className = 'chat-frame-container';
            
            // Chat iframe létrehozása
            const chatIframe = document.createElement('iframe');
            const channelName = new URL(url).searchParams.get('channel');
            chatIframe.src = `https://www.twitch.tv/embed/${channelName}/chat?parent=${window.location.hostname}&darkpopout&transparent=true`;
            chatIframe.style.width = '100%';
            chatIframe.style.height = '100%';
            chatIframe.style.border = 'none';
            chatFrameContainer.appendChild(chatIframe);

            // Chat elemek összeállítása
            chatContainer.appendChild(chatHeader);
            chatContainer.appendChild(chatFrameContainer);

            // Chat funkciók hozzáadása
            const chatTabs = chatHeader.querySelectorAll('.chat-tab');
            chatTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    chatTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                });
            });

            const [settingsBtn, popoutBtn, hideBtn] = chatHeader.querySelectorAll('.chat-setting-button');

            // Chat beállítások gomb
            settingsBtn.addEventListener('click', () => {
                // Chat beállítások megnyitása
                const event = new MessageEvent('message', {
                    data: {
                        type: 'chat-settings'
                    }
                });
                chatIframe.contentWindow.postMessage('open-chat-settings', '*');
            });

            // Felugró chat gomb
            popoutBtn.addEventListener('click', () => {
                const width = 400;
                const height = 600;
                const left = window.screen.width - width;
                const top = 0;
                window.open(
                    `https://www.twitch.tv/popout/${channelName}/chat?darkpopout&parent=${window.location.hostname}`,
                    'chat_popout',
                    `width=${width},height=${height},left=${left},top=${top}`
                );
            });

            // Chat elrejtése gomb
            hideBtn.addEventListener('click', () => {
                chatContainer.style.opacity = '0';
                setTimeout(() => {
                    chatContainer.remove();
                }, 500);
            });

            // Stream információk megjelenítése
            const streamInfo = document.createElement('div');
            streamInfo.className = 'stream-info';
            streamInfo.innerHTML = `
                <div class="stream-info-header">
                    <div>${currentVideo.userName}</div>
                    <button class="stream-info-close">×</button>
                </div>
                <div class="stream-info-content">
                    <div>${currentVideo.title}</div>
                    <div>Nézők: ${currentVideo.viewerCount}</div>
                    <div>Kategória: ${currentVideo.category}</div>
                    <div>Nyelv: ${currentVideo.language}</div>
                </div>
            `;

            // Stream info eseménykezelők
            let hideTimeout;
            streamInfo.addEventListener('mouseenter', () => {
                if (this.streamInfoVisible) {
                    clearTimeout(hideTimeout);
                    streamInfo.classList.add('visible');
                }
            });

            streamInfo.addEventListener('mouseleave', () => {
                if (this.streamInfoVisible) {
                    hideTimeout = setTimeout(() => {
                        streamInfo.classList.remove('visible');
                    }, 2000);
                }
            });

            // Bezáró gomb eseménykezelő
            const closeButton = streamInfo.querySelector('.stream-info-close');
            closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.streamInfoVisible = false;
                streamInfo.classList.remove('visible');
            });

            // Elementek hozzáadása a dokumentumhoz
            document.body.appendChild(streamContainer);
            document.body.appendChild(chatContainer);
            document.body.appendChild(streamInfo);

            // Animációk időzítése
            setTimeout(() => {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    loadingOverlay.remove();
                    streamContainer.classList.add('visible');
                    chatContainer.classList.add('visible');
                    if (this.streamInfoVisible) {
                        streamInfo.classList.add('visible');
                        hideTimeout = setTimeout(() => {
                            streamInfo.classList.remove('visible');
                        }, 2000);
                    }
                    backButton.classList.add('visible');
                }, 500);
            }, 1500);

            // Mobilos eseménykezelők hozzáadása a stream vezérlőkhöz
            streamControls.addEventListener('touchstart', (e) => {
                e.stopPropagation();
            }, { passive: true });

            // Dupla érintés kezelése teljes képernyőhöz
            let lastTap = 0;
            streamContainer.addEventListener('touchend', (e) => {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                
                if (tapLength < 500 && tapLength > 0) {
                    // Dupla érintés
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        streamContainer.requestFullscreen();
                    }
                    e.preventDefault();
                }
                lastTap = currentTime;
            });

            // Swipe gesztusok kezelése a streamek közötti váltáshoz
            let touchStartX = 0;
            let touchEndX = 0;

            streamContainer.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
            }, { passive: true });

            streamContainer.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].clientX;
                handleSwipe();
            }, { passive: true });

            const handleSwipe = () => {
                const swipeThreshold = 100;
                const diff = touchEndX - touchStartX;

                if (Math.abs(diff) > swipeThreshold) {
                    if (diff > 0 && this.currentVideoIndex > 0) {
                        // Jobbra swipe - előző videó
                        this.prevVideo();
                    } else if (diff < 0 && this.currentVideoIndex < this.videos.length - 1) {
                        // Balra swipe - következő videó
                        this.nextVideo();
                    }
                }
            };

            resolve(iframe);
        });
    }

    async showCategories() {
        try {
            // Stream és chat elrejtése
            const streamContainer = document.querySelector('.stream-container');
            const chatContainer = document.querySelector('.chat-container');
            const navButtons = document.querySelector('.navigation-buttons');
            const streamInfo = document.querySelector('.stream-info');
            const backButton = document.querySelector('.back-button');
            const streamsContainer = document.querySelector('.streams-container');
            const favoritesButton = document.querySelector('.favorites-button');
            const favoritesSection = document.querySelector('.favorites-section');

            // Elemek elrejtése
            [streamContainer, chatContainer, navButtons, streamInfo, backButton, streamsContainer, favoritesButton, favoritesSection].forEach(element => {
                if (element) {
                    element.style.opacity = '0';
                    setTimeout(() => element.remove(), 500);
                }
            });

            // Kategóriák betöltése
            await this.getTwitchCategories();
            
            // Kategóriák konténer létrehozása vagy újrahasználása
            let categoriesContainer = document.querySelector('.categories-container');
            
            // Ha létezik, töröljük és újra létrehozzuk
            if (categoriesContainer) {
                categoriesContainer.remove();
            }

            // Új kategória konténer létrehozása
            categoriesContainer = document.createElement('div');
            categoriesContainer.className = 'categories-container';

            // Kategóriák hozzáadása
            this.categories.forEach(category => {
                const card = document.createElement('div');
                card.className = 'category-card';
                card.innerHTML = `
                    <img src="${category.boxArtUrl.replace('{width}', '200').replace('{height}', '200')}" 
                         alt="${category.name}" 
                         class="category-image">
                    <div class="category-info">
                        <div class="category-name">${category.name}</div>
                        ${category.topStreamer ? `
                            <div class="category-streamer">
                                🎮 ${category.topStreamer}
                                <br>
                                👥 ${category.viewerCount.toLocaleString('hu-HU')} néző
                            </div>
                        ` : ''}
                    </div>
                `;
                
                card.addEventListener('click', () => this.selectCategory(category));
                categoriesContainer.appendChild(card);
            });

            document.body.appendChild(categoriesContainer);

            // Új kedvencek gomb létrehozása
            const newFavoritesButton = document.createElement('button');
            newFavoritesButton.className = 'favorites-button';
            newFavoritesButton.innerHTML = '⭐ Kedvenceim';
            newFavoritesButton.addEventListener('click', () => this.showFavorites());
            document.body.appendChild(newFavoritesButton);

            // Kategóriák és kedvencek gomb megjelenítése késleltetéssel
            setTimeout(() => {
                categoriesContainer.style.display = 'flex';
                categoriesContainer.style.opacity = '1';
                categoriesContainer.classList.add('visible');
                newFavoritesButton.classList.add('visible');
            }, 100);

            this.streamInfoVisible = true;
        } catch (error) {
            console.error('Hiba a kategóriák megjelenítésénél:', error);
        }
    }

    nextVideo() {
        if (this.videos.length > 0) {
            this.currentVideoIndex = (this.currentVideoIndex + 1) % this.videos.length;
            this.loadVideo(this.videos[this.currentVideoIndex].url);
        }
    }

    prevVideo() {
        if (this.videos.length > 0) {
            this.currentVideoIndex = (this.currentVideoIndex - 1 + this.videos.length) % this.videos.length;
            this.loadVideo(this.videos[this.currentVideoIndex].url);
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }

    showPrivacyPolicy() {
        // Régi privacy container és overlay eltávolítása, ha létezik
        const oldPrivacyContainer = document.querySelector('.privacy-container');
        const oldOverlay = document.querySelector('.privacy-overlay');
        if (oldPrivacyContainer) {
            oldPrivacyContainer.remove();
        }
        if (oldOverlay) {
            oldOverlay.remove();
        }

        // Overlay létrehozása
        const overlay = document.createElement('div');
        overlay.className = 'privacy-overlay';
        document.body.appendChild(overlay);

        // Privacy container létrehozása
        const privacyContainer = document.createElement('div');
        privacyContainer.className = 'privacy-container';
        privacyContainer.style.zIndex = '3000';
        privacyContainer.innerHTML = `
            <div class="privacy-header">
                <h1>Adatvédelmi Tájékoztató</h1>
                <button class="privacy-close">×</button>
            </div>
            
            <div class="privacy-content">
                <h2>1. Bevezetés</h2>
                <p>A Tuttly elkötelezett a felhasználók magánéletének védelme iránt. Alapelvünk a minimális adatgyűjtés és a teljes átláthatóság. Ez az adatvédelmi tájékoztató részletesen ismerteti, hogyan kezeljük az Ön adatait.</p>

                <h2>2. Adatkezelés</h2>
                <p>A Tuttly egy közvetítő platform, amely a Twitch szolgáltatásait használja. Fontos tudni, hogy:
                   - Nem tárolunk személyes adatokat
                   - Nem követjük nyomon a felhasználói tevékenységet
                   - Nem használunk analitikai eszközöket
                   - Nem hozunk létre felhasználói profilokat</p>

                <h2>3. Szükséges Technikai Adatok</h2>
                <p>Az oldal működéséhez kizárólag a következő technikai adatokra van szükség:
                   - A kiválasztott nyelvi beállítás (munkamenet időtartamára)
                   - Ideiglenes munkamenet adatok a stream lejátszásához
                   Ezek az adatok csak a böngésző memóriájában tárolódnak és az oldal bezárásával törlődnek.</p>

                <h2>4. Cookie Használat</h2>
                <p>Oldalunk nem használ követő vagy marketing célú cookie-kat. Kizárólag a működéshez elengedhetetlen munkamenet cookie-kat alkalmazzuk, amelyek a böngésző bezárásával automatikusan törlődnek.</p>

                <h2>5. Twitch Integráció</h2>
                <p>A streamek megtekintéséhez a Twitch szolgáltatását használjuk. A Twitch saját adatvédelmi szabályzattal rendelkezik, amelyet a következő linken tekinthet meg: 
                <a href="https://www.twitch.tv/p/privacy-policy" target="_blank" style="color: #9146FF;">Twitch Adatvédelmi Szabályzat</a></p>

                <h2>6. Felhasználói Jogok</h2>
                <p>Mivel nem gyűjtünk személyes adatokat, nincs szükség:
                   - Adatok törlésére
                   - Adatok módosítására
                   - Adatok exportálására
                   Az oldal használata teljesen anonim.</p>

                <h2>7. Kapcsolat</h2>
                <p>Ha kérdése van az adatvédelemmel kapcsolatban, írjon nekünk: tuttly.early373@passinbox.com</p>

                <h2>8. Frissítések</h2>
                <p>Ezt az adatvédelmi tájékoztatót rendszeresen felülvizsgáljuk. Utolsó frissítés: ${new Date().toLocaleDateString('hu-HU')}</p>
            </div>
        `;

        // Bezáró gomb eseménykezelő
        const closeButton = privacyContainer.querySelector('.privacy-close');
        closeButton.addEventListener('click', () => {
            privacyContainer.style.opacity = '0';
            overlay.style.opacity = '0';
            setTimeout(() => {
                privacyContainer.remove();
                overlay.remove();
            }, 500);
        });

        // Overlay kattintás eseménykezelő
        overlay.addEventListener('click', () => {
            privacyContainer.style.opacity = '0';
            overlay.style.opacity = '0';
            setTimeout(() => {
                privacyContainer.remove();
                overlay.remove();
            }, 500);
        });

        document.body.appendChild(privacyContainer);

        // Animációk időzítése
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
            privacyContainer.classList.add('visible');
        });
    }

    showFavorites() {
        // Régi elemek elrejtése
        const containers = document.querySelectorAll('.categories-container, .streams-container, .stream-container, .chat-container');
        containers.forEach(container => {
            if (container) {
                container.style.opacity = '0';
                setTimeout(() => container.style.display = 'none', 500);
            }
        });

        // Home gomb létrehozása
        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        backButton.innerHTML = '🏠 Home';
        backButton.addEventListener('click', () => this.showCategories());
        document.body.appendChild(backButton);

        // Kedvencek szekció létrehozása
        const favoritesSection = document.createElement('div');
        favoritesSection.className = 'favorites-section';
        favoritesSection.innerHTML = `
            <div class="favorites-header">
                <h2>Kedvenceim</h2>
            </div>
            <div class="favorites-tabs">
                <div class="favorites-tab active" data-tab="categories">Kategóriák</div>
                <div class="favorites-tab" data-tab="streams">Streamek</div>
            </div>
            <div class="favorites-content">
                <div class="favorites-categories">
                    ${this.favorites.categories.length > 0 ? `
                        <div class="categories-grid">
                            ${this.favorites.categories.map(category => `
                                <div class="category-card" data-id="${category.id}">
                                    <img src="${category.boxArtUrl.replace('{width}', '200').replace('{height}', '200')}" 
                                         alt="${category.name}" 
                                         class="category-image">
                                    <div class="category-info">
                                        <div class="category-name">${category.name}</div>
                                        ${category.topStreamer ? `
                                            <div class="category-streamer">
                                                🎮 ${category.topStreamer}
                                                <br>
                                                👥 ${category.viewerCount.toLocaleString('hu-HU')} néző
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<div class="favorites-empty">Nincsenek mentett kategóriák</div>'}
                </div>
                <div class="favorites-streams" style="display: none;">
                    ${this.favorites.streams.length > 0 ? `
                        <div class="streams-grid">
                            ${this.favorites.streams.map((stream, index) => `
                                <div class="stream-card" data-index="${index}" data-language="${stream.language}" data-title="${stream.title}" data-username="${stream.userName}">
                                    <div class="stream-thumbnail">
                                        <img src="https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.userName.toLowerCase()}-440x248.jpg" alt="${stream.title}">
                                        <div class="live-indicator">LIVE</div>
                                        <div class="viewer-count">${stream.viewerCount.toLocaleString('hu-HU')} néző</div>
                                        <button class="favorite-button active" data-stream-id="${stream.userName}">⭐</button>
                                    </div>
                                    <div class="stream-card-info">
                                        <div class="stream-card-user">👤 ${stream.userName}</div>
                                        <div class="stream-card-title">${stream.title}</div>
                                        <div class="stream-tags">
                                            <span class="tag">${stream.category}</span>
                                            <span class="tag">${stream.language.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<div class="favorites-empty">Nincsenek mentett streamek</div>'}
                </div>
            </div>
        `;

        // Tab váltás eseménykezelő
        const tabs = favoritesSection.querySelectorAll('.favorites-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const content = favoritesSection.querySelector('.favorites-content');
                const categories = content.querySelector('.favorites-categories');
                const streams = content.querySelector('.favorites-streams');
                
                if (tab.dataset.tab === 'categories') {
                    categories.style.display = 'block';
                    streams.style.display = 'none';
                } else {
                    categories.style.display = 'none';
                    streams.style.display = 'block';
                }
            });
        });

        // Kategória kártyák eseménykezelői
        favoritesSection.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                const category = this.favorites.categories.find(c => c.id === card.dataset.id);
                if (category) {
                    this.selectCategory(category);
                }
            });
        });

        // Stream kártyák eseménykezelői
        favoritesSection.querySelectorAll('.stream-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.index);
                this.currentVideoIndex = index;
                this.loadVideo(this.favorites.streams[index].url);
                favoritesSection.style.opacity = '0';
                setTimeout(() => {
                    favoritesSection.remove();
                }, 500);
            });
        });

        // Kedvenc gombok eseménykezelői
        favoritesSection.querySelectorAll('.favorite-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const streamId = button.dataset.streamId;
                this.toggleFavoriteStream(streamId);
                button.classList.toggle('active');
            });
        });

        document.body.appendChild(favoritesSection);

        // Animációk időzítése
        requestAnimationFrame(() => {
            backButton.classList.add('visible');
            favoritesSection.classList.add('visible');
        });
    }

    toggleFavoriteCategory(category) {
        const index = this.favorites.categories.findIndex(c => c.id === category.id);
        if (index === -1) {
            this.favorites.categories.push(category);
        } else {
            this.favorites.categories.splice(index, 1);
        }
        this.saveFavorites();
    }

    toggleFavoriteStream(streamId) {
        const stream = this.videos.find(s => s.userName === streamId);
        if (!stream) return;

        const index = this.favorites.streams.findIndex(s => s.userName === streamId);
        if (index === -1) {
            this.favorites.streams.push(stream);
        } else {
            this.favorites.streams.splice(index, 1);
        }
        this.saveFavorites();
    }

    saveFavorites() {
        localStorage.setItem('tuttlyFavorites', JSON.stringify(this.favorites));
    }

    async addToViewHistory(stream, category) {
        // Stream hozzáadása az előzményekhez
        const streamHistory = {
            userName: stream.userName,
            category: stream.category,
            language: stream.language,
            timestamp: Date.now()
        };

        // Kategória hozzáadása az előzményekhez
        const categoryHistory = {
            id: category.id,
            name: category.name,
            timestamp: Date.now()
        };

        // Csak az utolsó 50 megtekintést tároljuk
        this.viewHistory.streams.unshift(streamHistory);
        this.viewHistory.streams = this.viewHistory.streams.slice(0, 50);

        this.viewHistory.categories.unshift(categoryHistory);
        this.viewHistory.categories = this.viewHistory.categories.slice(0, 50);

        // Előzmények mentése
        localStorage.setItem('tuttlyViewHistory', JSON.stringify(this.viewHistory));
    }

    async getTrendingCategories() {
        try {
            if (!this.accessToken) {
                await this.getTwitchAccessToken();
            }

            // Népszerű kategóriák lekérése a felhasználó által preferált nyelveken
            const preferredLanguages = this.getPreferredLanguages();
            const response = await axios.get('https://api.twitch.tv/helix/games/top', {
                headers: {
                    'Client-ID': this.clientId,
                    'Authorization': `Bearer ${this.accessToken}`
                },
                params: {
                    first: 10
                }
            });

            this.trendingCategories = response.data.data;
            return this.trendingCategories;
        } catch (error) {
            console.error('Hiba a népszerű kategóriák lekérésekor:', error);
            return [];
        }
    }

    getPreferredLanguages() {
        // Nyelvek gyakorisága a megtekintési előzményekben
        const languageCounts = {};
        this.viewHistory.streams.forEach(stream => {
            languageCounts[stream.language] = (languageCounts[stream.language] || 0) + 1;
        });

        // Rendezés gyakoriság szerint
        return Object.entries(languageCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([lang]) => lang)
            .slice(0, 3);
    }

    async getRecommendedCategories() {
        // Kategóriák rendezése megtekintési gyakoriság alapján
        const categoryCounts = {};
        this.viewHistory.categories.forEach(category => {
            categoryCounts[category.id] = (categoryCounts[category.id] || 0) + 1;
        });

        // Top 5 leggyakrabban nézett kategória
        return this.categories
            .filter(category => categoryCounts[category.id])
            .sort((a, b) => (categoryCounts[b.id] || 0) - (categoryCounts[a.id] || 0))
            .slice(0, 5);
    }

    async checkConnectionSpeed() {
        // Ne futtassuk túl gyakran a sebesség tesztet
        const now = Date.now();
        if (now - this.lastSpeedTest < this.speedTestInterval) {
            return this.connectionSpeed;
        }

        try {
            const startTime = performance.now();
            const response = await fetch('https://static-cdn.jtvnw.net/jtv_user_pictures/test-pattern-1x1.jpg');
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Sebesség meghatározása a válaszidő alapján
            if (duration < 100) {
                this.connectionSpeed = 'high';
            } else if (duration < 300) {
                this.connectionSpeed = 'medium';
            } else {
                this.connectionSpeed = 'low';
            }

            this.lastSpeedTest = now;
            return this.connectionSpeed;
        } catch (error) {
            console.error('Hiba a sebesség teszt során:', error);
            return 'low'; // Hiba esetén alacsony minőség
        }
    }

    getQualityBasedOnSpeed() {
        switch (this.connectionSpeed) {
            case 'high':
                return 'chunked'; // Legjobb minőség
            case 'medium':
                return '720p'; // Közepes minőség
            case 'low':
                return '480p'; // Alacsony minőség
            default:
                return '480p';
        }
    }

    async preloadStreams() {
        if (this.videos.length === 0) return;

        // Következő és előző streamek előtöltése
        const streamsToPreload = [];
        const currentIndex = this.currentVideoIndex;

        // Következő streamek
        for (let i = 1; i <= this.maxPreloadedStreams; i++) {
            const nextIndex = (currentIndex + i) % this.videos.length;
            streamsToPreload.push(this.videos[nextIndex]);
        }

        // Előző streamek
        for (let i = 1; i <= this.maxPreloadedStreams; i++) {
            const prevIndex = (currentIndex - i + this.videos.length) % this.videos.length;
            streamsToPreload.push(this.videos[prevIndex]);
        }

        // Régi előtöltött streamek törlése
        for (const [key, value] of this.preloadedStreams.entries()) {
            if (!streamsToPreload.find(s => s.userName === key)) {
                this.preloadedStreams.delete(key);
            }
        }

        // Új streamek előtöltése
        for (const stream of streamsToPreload) {
            if (!this.preloadedStreams.has(stream.userName)) {
                const thumbnailUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.userName.toLowerCase()}-440x248.jpg`;
                try {
                    const img = new Image();
                    img.src = thumbnailUrl;
                    this.preloadedStreams.set(stream.userName, {
                        thumbnail: img,
                        timestamp: Date.now()
                    });
                } catch (error) {
                    console.error('Hiba a stream előtöltése során:', error);
                }
            }
        }
    }

    async updateStreamQuality(iframe) {
        const oldSpeed = this.connectionSpeed;
        const speed = await this.checkConnectionSpeed();
        const quality = this.getQualityBasedOnSpeed();
        
        // Csak akkor váltunk minőséget, ha változott a sebesség
        if (oldSpeed !== speed) {
            const message = {
                type: 'quality',
                value: quality
            };
            
            try {
                iframe.contentWindow.postMessage(message, '*');
                
                // Értesítés megjelenítése
                const qualityMap = {
                    'high': 'Legjobb',
                    'medium': 'Közepes',
                    'low': 'Alacsony'
                };
                this.showNotification(
                    `Minőség automatikusan ${qualityMap[speed]} minőségre állítva`,
                    speed === 'high' ? 'success' : (speed === 'medium' ? 'warning' : 'error')
                );
            } catch (error) {
                console.error('Hiba a minőség váltás során:', error);
                this.showNotification('Hiba történt a minőség váltás során', 'error');
            }
        }
    }

    handleOfflineMode() {
        window.addEventListener('online', () => {
            this.isOffline = false;
            this.showOfflineIndicator(false);
            this.showNotification('Újra online vagy! Adatok szinkronizálása...', 'success');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOffline = true;
            this.showOfflineIndicator(true);
            this.showNotification('Offline módra váltás...', 'warning');
            this.saveOfflineData();
        });
    }

    saveOfflineData() {
        const offlineData = {
            categories: this.categories,
            streams: this.videos,
            favorites: this.favorites,
            viewHistory: this.viewHistory
        };
        
        try {
            localStorage.setItem('tuttlyOfflineData', JSON.stringify(offlineData));
        } catch (error) {
            console.error('Hiba az offline adatok mentése során:', error);
        }
    }

    async syncOfflineData() {
        if (!this.isOffline) {
            try {
                // Kategóriák szinkronizálása
                await this.getTwitchCategories();
                
                // Kedvencek és előzmények frissítése
                if (this.currentCategory) {
                    await this.fetchStreamsByCategory(this.currentCategory.id);
                }
                
                // Offline adatok törlése
                localStorage.removeItem('tuttlyOfflineData');
            } catch (error) {
                console.error('Hiba az adatok szinkronizálása során:', error);
            }
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Régi értesítés eltávolítása
        const oldNotification = document.querySelector('.notification');
        if (oldNotification) {
            oldNotification.remove();
        }

        // Új értesítés létrehozása
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Ikon hozzáadása típus alapján
        let icon = '💡';
        switch (type) {
            case 'success':
                icon = '✅';
                break;
            case 'warning':
                icon = '⚠️';
                break;
            case 'error':
                icon = '❌';
                break;
        }
        
        notification.innerHTML = `${icon} ${message}`;
        document.body.appendChild(notification);

        // Animáció
        requestAnimationFrame(() => {
            notification.classList.add('visible');
        });

        // Automatikus eltűnés
        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    showOfflineIndicator(show = true) {
        let indicator = document.querySelector('.offline-indicator');
        
        if (show) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'offline-indicator';
                indicator.innerHTML = '📡 Offline mód';
                document.body.appendChild(indicator);
                
                requestAnimationFrame(() => {
                    indicator.classList.add('visible');
                });
            }
        } else if (indicator) {
            indicator.classList.remove('visible');
            setTimeout(() => indicator.remove(), 300);
        }
    }

    onOrientationChange() {
        // Késleltetés az orientációváltás befejezéséig
        setTimeout(() => {
            // Stream és chat konténer újraméretezése
            const streamContainer = document.querySelector('.stream-container');
            const chatContainer = document.querySelector('.chat-container');

            if (streamContainer && chatContainer) {
                if (window.orientation === 90 || window.orientation === -90) {
                    // Fekvő mód
                    streamContainer.style.height = '100vh';
                    streamContainer.style.width = '70vw';
                    chatContainer.style.height = '100vh';
                    chatContainer.style.width = '30vw';
                    chatContainer.style.top = '0';
                    chatContainer.style.right = '0';
                } else {
                    // Álló mód
                    streamContainer.style.height = '40vh';
                    streamContainer.style.width = '100vw';
                    chatContainer.style.height = '60vh';
                    chatContainer.style.width = '100vw';
                    chatContainer.style.top = '40vh';
                }
            }

            // Kategóriák és streamek konténer újrarendezése
            const categoriesContainer = document.querySelector('.categories-container');
            const streamsContainer = document.querySelector('.streams-container');

            if (categoriesContainer) {
                categoriesContainer.style.gridTemplateColumns = 
                    window.orientation === 0 ? 'repeat(auto-fill, minmax(150px, 1fr))' : 'repeat(auto-fill, minmax(200px, 1fr))';
            }

            if (streamsContainer) {
                streamsContainer.style.gridTemplateColumns = 
                    window.orientation === 0 ? 'repeat(auto-fill, minmax(150px, 1fr))' : 'repeat(auto-fill, minmax(200px, 1fr))';
            }

            // Scroll pozíció visszaállítása
            window.scrollTo(0, 0);
        }, 100);
    }
}

// Alkalmazás indítása
new TuttlyApp();