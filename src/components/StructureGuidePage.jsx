/**
 * StructureGuidePage Component
 * Visual guide showing app structure for development team
 */
import React from 'react'
import './StructureGuidePage.css'
import './WelcomePage.css'
import './Header.css'

const StructureGuidePage = () => {
  return (
    <div className="structure-guide-page">
      <div className="structure-guide-container">
        {/* Header */}
        <div className="structure-guide-header">
          <h1 className="structure-guide-title">Build Structure Guide</h1>
          <p className="structure-guide-subtitle">
            Visual documentation of the app architecture, components, and navigation flow
          </p>
        </div>

        {/* Section 1: Welcome Widget Components */}
        <section className="structure-guide-section">
          <h2 className="structure-guide-section-title">Welcome Widget Components</h2>
          <p className="structure-guide-section-desc">
            Compact index components in the welcome widget sidebar showing market sentiment and dominance metrics.
          </p>
          
          <div className="structure-guide-components-grid">
            {/* Fear & Greed Preview */}
            <div className="structure-guide-component-card">
              <div className="structure-guide-component-header">
                <h3 className="structure-guide-component-title">Fear & Greed Index</h3>
                <span className="structure-guide-component-status">Implemented</span>
              </div>
              <div className="structure-guide-component-preview">
                <div className="structure-guide-preview-fng">
                  <div className="welcome-widget-fear-greed-compact">
                    <div className="welcome-widget-fng-compact-content">
                      <span className="welcome-widget-fng-compact-label">Fear & Greed</span>
                      <div className="welcome-widget-fng-compact-value-group">
                        <span className="welcome-widget-fng-compact-value">35</span>
                        <span className="welcome-widget-fng-compact-classification">Fear</span>
                      </div>
                    </div>
                    <div className="welcome-widget-fng-compact-bar">
                      <div className="welcome-widget-fng-compact-bar-fill" style={{ width: '35%' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="structure-guide-component-info">
                <div className="structure-guide-info-item">
                  <strong>Location:</strong> <code>src/components/WelcomePage.jsx</code>
                </div>
                <div className="structure-guide-info-item">
                  <strong>Data Source:</strong> Alternative.me Fear & Greed API
                </div>
                <div className="structure-guide-info-item">
                  <strong>Update Frequency:</strong> Every 60 minutes
                </div>
                <div className="structure-guide-info-item">
                  <strong>Features:</strong> Compact pill design, value (0-100), classification label, gradient progress bar
                </div>
              </div>
            </div>

            {/* Alt Season Preview */}
            <div className="structure-guide-component-card">
              <div className="structure-guide-component-header">
                <h3 className="structure-guide-component-title">Alt Season Index</h3>
                <span className="structure-guide-component-status">Implemented</span>
              </div>
              <div className="structure-guide-component-preview">
                <div className="structure-guide-preview-alt">
                  <div className="welcome-widget-alt-season-compact">
                    <div className="welcome-widget-alt-compact-content">
                      <span className="welcome-widget-alt-compact-label">Alt Season</span>
                      <div className="welcome-widget-alt-compact-value-group">
                        <span className="welcome-widget-alt-compact-value">31</span>
                        <span className="welcome-widget-alt-compact-classification">Rotation</span>
                      </div>
                      <div className="welcome-widget-alt-compact-shares">
                        <span className="welcome-widget-alt-compact-share">
                          <span className="welcome-widget-alt-compact-dot btc" /> BTC 58.4%
                        </span>
                        <span className="welcome-widget-alt-compact-share">
                          <span className="welcome-widget-alt-compact-dot eth" /> ETH 10.2%
                        </span>
                      </div>
                    </div>
                    <div className="welcome-widget-alt-compact-bar">
                      <div className="welcome-widget-alt-compact-bar-fill" style={{ width: '31%' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="structure-guide-component-info">
                <div className="structure-guide-info-item">
                  <strong>Location:</strong> <code>src/components/WelcomePage.jsx</code>
                </div>
                <div className="structure-guide-info-item">
                  <strong>Data Source:</strong> Static/mock data (placeholder for API integration)
                </div>
                <div className="structure-guide-info-item">
                  <strong>Features:</strong> Value, label, BTC/ETH share percentages, purple gradient bar
                </div>
              </div>
            </div>

            {/* Market Dominance Preview */}
            <div className="structure-guide-component-card">
              <div className="structure-guide-component-header">
                <h3 className="structure-guide-component-title">Market Dominance Layer</h3>
                <span className="structure-guide-component-status">Implemented</span>
              </div>
              <div className="structure-guide-component-preview">
                <div className="structure-guide-preview-dominance">
                  <div className="welcome-widget-dominance-compact">
                    <span className="welcome-widget-dominance-label">Market Dominance</span>
                    <div className="welcome-widget-dominance-items">
                      <div className="welcome-widget-dominance-item">
                        <div className="welcome-widget-dominance-item-header">
                          <span className="welcome-widget-dominance-symbol">BTC</span>
                          <span className="welcome-widget-dominance-value">56.4%</span>
                        </div>
                        <div className="welcome-widget-dominance-bar">
                          <div className="welcome-widget-dominance-bar-fill btc" style={{ width: '56.4%' }} />
                        </div>
                      </div>
                      <div className="welcome-widget-dominance-item">
                        <div className="welcome-widget-dominance-item-header">
                          <span className="welcome-widget-dominance-symbol">ETH</span>
                          <span className="welcome-widget-dominance-value">18.2%</span>
                        </div>
                        <div className="welcome-widget-dominance-bar">
                          <div className="welcome-widget-dominance-bar-fill eth" style={{ width: '18.2%' }} />
                        </div>
                      </div>
                      <div className="welcome-widget-dominance-item">
                        <div className="welcome-widget-dominance-item-header">
                          <span className="welcome-widget-dominance-symbol">SOL</span>
                          <span className="welcome-widget-dominance-value">3.8%</span>
                        </div>
                        <div className="welcome-widget-dominance-bar">
                          <div className="welcome-widget-dominance-bar-fill sol" style={{ width: '3.8%' }} />
                        </div>
                      </div>
                      <div className="welcome-widget-dominance-item">
                        <div className="welcome-widget-dominance-item-header">
                          <span className="welcome-widget-dominance-symbol">Alts</span>
                          <span className="welcome-widget-dominance-value">21.6%</span>
                        </div>
                        <div className="welcome-widget-dominance-bar">
                          <div className="welcome-widget-dominance-bar-fill alts" style={{ width: '21.6%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="structure-guide-component-info">
                <div className="structure-guide-info-item">
                  <strong>Location:</strong> <code>src/components/WelcomePage.jsx</code>
                </div>
                <div className="structure-guide-info-item">
                  <strong>Data Source:</strong> Simulated data (updates every 5 minutes)
                </div>
                <div className="structure-guide-info-item">
                  <strong>Features:</strong> BTC, ETH, SOL, Alts percentages with color-coded progress bars
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Top Toggles & Navigation */}
        <section className="structure-guide-section">
          <h2 className="structure-guide-section-title">Top Toggles & Navigation</h2>
          <p className="structure-guide-section-desc">
            Header controls that switch between market modes and enable navigation to different views.
          </p>
          
          <div className="structure-guide-toggle-section">
            <div className="structure-guide-toggle-card">
              <div className="structure-guide-component-header">
                <h3 className="structure-guide-component-title">Crypto / Stocks Toggle</h3>
                <span className="structure-guide-component-status">Implemented</span>
              </div>
              <div className="structure-guide-toggle-preview">
                <div className="structure-guide-header-mockup">
                  <div className="header-market-toggle">
                    <button type="button" className="active">Crypto</button>
                    <button type="button">Stocks</button>
                  </div>
                </div>
              </div>
              <div className="structure-guide-component-info">
                <div className="structure-guide-info-item">
                  <strong>Location:</strong> <code>src/components/Header.jsx</code>
                </div>
                <div className="structure-guide-info-item">
                  <strong>Functionality:</strong> Search, navigation, and day/night mode controls
                </div>
                <div className="structure-guide-info-item">
                  <strong>State Management:</strong> Persisted in localStorage, affects WelcomePage, search, and data display
                </div>
                <div className="structure-guide-info-item">
                  <strong>Impact:</strong> Changes top coins row, search results, and market data sources
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Screener Flow */}
        <section className="structure-guide-section">
          <h2 className="structure-guide-section-title">Screener Flow</h2>
          <p className="structure-guide-section-desc">
            Complete navigation flow from header button to token detail view with screener functionality.
          </p>
          
          <div className="structure-guide-flow-section">
            {/* Flow Diagram */}
            <div className="structure-guide-flow-diagram">
              <div className="flow-step">
                <div className="flow-step-number">1</div>
                <div className="flow-step-content">
                  <h4>SCREENER Button</h4>
                  <p>Located in header right section</p>
                  <code>src/components/Header.jsx</code>
                </div>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <div className="flow-step-number">2</div>
                <div className="flow-step-content">
                  <h4>Navigation</h4>
                  <p>Switches to token view</p>
                  <code>currentView = 'token'</code>
                </div>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <div className="flow-step-number">3</div>
                <div className="flow-step-content">
                  <h4>Token Detail View</h4>
                  <p>TradingChart + DataTabs + RightPanel</p>
                  <code>src/components/TradingChart.jsx</code>
                  <code>src/components/DataTabs.jsx</code>
                </div>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <div className="flow-step-number">4</div>
                <div className="flow-step-content">
                  <h4>Screener Features</h4>
                  <p>Filtering, sorting, trade analysis</p>
                  <code>DataTabs: Trades, Holders, etc.</code>
                </div>
              </div>
            </div>

            <div className="structure-guide-screener-details">
              <div className="structure-guide-detail-card">
                <h4>SCREENER Button Details</h4>
                <ul>
                  <li><strong>Location:</strong> Header right section, styled as "SCREENER" with lightning icon</li>
                  <li><strong>Action:</strong> Sets <code>discoverOnly = false</code> and navigates to token view</li>
                  <li><strong>State:</strong> Active when <code>currentView === 'token'</code></li>
                </ul>
              </div>
              
              <div className="structure-guide-detail-card">
                <h4>Token View Components</h4>
                <ul>
                  <li><strong>TradingChart:</strong> Main candlestick chart with timeframes and indicators</li>
                  <li><strong>DataTabs:</strong> Tabs for Trades, Holders, Analytics with filtering</li>
                  <li><strong>RightPanel:</strong> Watchlist and additional token information</li>
                  <li><strong>TokenTicker:</strong> Token banner with price and stats</li>
                </ul>
              </div>
              
              <div className="structure-guide-detail-card">
                <h4>Screener Functionality</h4>
                <ul>
                  <li><strong>Trade Filtering:</strong> By type, amount, price, network, time range</li>
                  <li><strong>Holder Analysis:</strong> Distribution, concentration, wallet types</li>
                  <li><strong>Real-time Updates:</strong> Live Scanning</li>
                  <li><strong>Export:</strong> Copy addresses, view on explorer</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Welcome Page Structure */}
        <section className="structure-guide-section">
          <h2 className="structure-guide-section-title">Welcome Page Structure</h2>
          <p className="structure-guide-section-desc">
            Complete outline of the landing page layout and component organization.
          </p>
          
          <div className="structure-guide-outline">
            <div className="outline-section">
              <div className="outline-header">
                <h3>Landing Page (WelcomePage.jsx)</h3>
              </div>
              <div className="outline-content">
                <div className="outline-item">
                  <div className="outline-item-header">
                    <span className="outline-item-icon">📊</span>
                    <strong>Top Bar (Header.jsx)</strong>
                  </div>
                  <div className="outline-item-details">
                    <ul>
                      <li>Navigation toggle (hamburger menu)</li>
                      <li>Logo (Spectre AI)</li>
                      <li>Weather widget</li>
                      <li>Date/Time display</li>
                      <li><strong>Crypto / Stocks Toggle</strong> (market mode switcher)</li>
                      <li>Search trigger</li>
                      <li><strong>SCREENER Button</strong> (navigates to token view)</li>
                      <li>Play button</li>
                      <li>Notifications & Settings icons</li>
                      <li>Profile avatar</li>
                    </ul>
                  </div>
                </div>
                
                <div className="outline-item">
                  <div className="outline-item-header">
                    <span className="outline-item-icon">📈</span>
                    <strong>Trending Section</strong>
                  </div>
                  <div className="outline-item-details">
                    <ul>
                      <li>TokenTicker component</li>
                      <li>Shows trending tokens with real-time prices</li>
                      <li>Scrollable horizontal ticker</li>
                    </ul>
                  </div>
                </div>
                
                <div className="outline-item">
                  <div className="outline-item-header">
                    <span className="outline-item-icon">🎯</span>
                    <strong>Welcome Widget Sidebar</strong>
                  </div>
                  <div className="outline-item-details">
                    <div className="outline-nested">
                      <div className="outline-nested-item">
                        <strong>Row 1: Profile</strong>
                        <ul>
                          <li>Avatar upload/display</li>
                          <li>Welcome message</li>
                          <li>Name input (editable)</li>
                        </ul>
                      </div>
                      
                      <div className="outline-nested-item">
                        <strong>Row 2: Top Assets</strong>
                        <ul>
                          <li>Crypto mode: BTC, SOL, ETH + Market Cap</li>
                          <li>Stocks mode: JPM, V, SPY + Index</li>
                          <li>Price cards with 1H, 24H, 7D performance</li>
                          <li>Click to open token detail popup</li>
                        </ul>
                      </div>
                      
                      <div className="outline-nested-item">
                        <strong>Row 3: Market Indices</strong>
                        <ul>
                          <li><strong>Fear & Greed Index</strong> (compact pill design)</li>
                          <li><strong>Alt Season Index</strong> (compact pill design)</li>
                        </ul>
                      </div>
                      
                      <div className="outline-nested-item">
                        <strong>Row 3.5: Market Dominance</strong>
                        <ul>
                          <li><strong>Market Dominance Layer</strong></li>
                          <li>BTC, ETH, SOL, Alts percentages</li>
                          <li>Color-coded progress bars</li>
                        </ul>
                      </div>
                      
                      <div className="outline-nested-item">
                        <strong>Row 4: US Equities</strong>
                        <ul>
                          <li>Market status (Open/Closed)</li>
                          <li>Time display</li>
                          <li>Countdown timer</li>
                        </ul>
                      </div>
                      
                      <div className="outline-nested-item">
                        <strong>Row 5: Command Center (Market AI)</strong>
                        <ul>
                          <li>Section header: "Command Center" with AI icon</li>
                          <li><strong>Tab Navigation:</strong> Analysis, News, Heatmaps, Liquidation, Sector, Mindshare, Calendar</li>
                          <li><strong>Analysis Tab:</strong>
                            <ul style={{marginTop: '8px', paddingLeft: '20px'}}>
                              <li>LIVE badge</li>
                              <li>Timeframe selector (1H, 24H, 7D, 30D, All Time)</li>
                              <li>AI-generated market summary text (real-time analysis)</li>
                              <li>Updated timestamp</li>
                            </ul>
                          </li>
                          <li><strong>News Tab:</strong>
                            <ul style={{marginTop: '8px', paddingLeft: '20px'}}>
                              <li>X Toggle - Enable/disable X (Twitter) news feed</li>
                              <li>Placeholder content</li>
                            </ul>
                          </li>
                          <li><strong>Heatmaps Tab:</strong>
                            <ul style={{marginTop: '8px', paddingLeft: '20px'}}>
                              <li>Bubbles Toggle - Enable/disable heatmaps bubbles view</li>
                              <li>Placeholder content</li>
                            </ul>
                          </li>
                          <li><strong>Other Tabs:</strong> Liquidation, Sector, Mindshare (placeholders)</li>
                          <li><strong>Calendar Tab:</strong> Economic calendar (see Row 6)</li>
                          <li>Footer with border</li>
                        </ul>
                      </div>
                      
                      <div className="outline-nested-item">
                        <strong>Row 6: Economic Calendar (in Command Center Calendar Tab)</strong>
                        <ul>
                          <li>Accessible via Command Center → Calendar tab</li>
                          <li><strong>Impact Level Filters</strong> - Low, Medium, High, Critical (multi-select chips)</li>
                          <li><strong>Time Range Selector</strong> - Day, Week, Month</li>
                          <li>Upcoming economic events list</li>
                          <li>Event details: date, time, name, impact level</li>
                          <li>Filtered by selected impact levels and time range</li>
                          <li>Mock data (placeholder for API integration)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="outline-item">
                  <div className="outline-item-header">
                    <span className="outline-item-icon">⭐</span>
                    <strong>Watchlist Widget (Right Side)</strong>
                  </div>
                  <div className="outline-item-details">
                    <div className="outline-nested">
                      <div className="outline-nested-item">
                        <strong>Watchlist Header</strong>
                        <ul>
                          <li>Title: "Watchlist"</li>
                          <li>Token count display</li>
                          <li>Sort dropdown (Default, Price, Change, Market Cap, Name)</li>
                        </ul>
                      </div>
                      
                      <div className="outline-nested-item">
                        <strong>Add Token Search</strong>
                        <ul>
                          <li>Search input with live token search</li>
                          <li>Dropdown with search results (max 8)</li>
                          <li>Add button (+ icon)</li>
                          <li>Real-time token search via Codex API</li>
                        </ul>
                      </div>
                      
                      <div className="outline-nested-item">
                        <strong>Watchlist Items</strong>
                        <ul>
                          <li>Token avatar with colored ring</li>
                          <li>Symbol and name</li>
                          <li>Real-time price (formatted)</li>
                          <li>24H change (color-coded)</li>
                          <li>Market cap (formatted)</li>
                          <li>Pin/unpin button (pin to top)</li>
                          <li>Remove button (X)</li>
                          <li>Drag & drop reordering</li>
                          <li>Empty state with heart icon</li>
                        </ul>
                      </div>
                      
                      <div className="outline-nested-item">
                        <strong>Features</strong>
                        <ul>
                          <li>Live price updates via useWatchlistPrices hook</li>
                          <li>Persisted in localStorage</li>
                          <li>Pinned items stay at top</li>
                          <li>Sortable by multiple criteria</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="outline-item">
                  <div className="outline-item-header">
                    <span className="outline-item-icon">📊</span>
                    <strong>Top Section Tabs</strong>
                  </div>
                  <div className="outline-item-details">
                    <ul>
                      <li><strong>Top Coins Tab</strong> - Shows token discovery grid/list</li>
                      <li><strong>On-Chain Tab</strong> - Coming soon placeholder</li>
                      <li><strong>Prediction Markets Tab</strong> - Coming soon placeholder</li>
                    </ul>
                  </div>
                </div>
                
                <div className="outline-item">
                  <div className="outline-item-header">
                    <span className="outline-item-icon">🔍</span>
                    <strong>Token Discovery Section</strong>
                  </div>
                  <div className="outline-item-details">
                    <div className="outline-nested">
                      <div className="outline-nested-item">
                        <strong>Filter Row</strong>
                        <ul>
                          <li><strong>Tabs Toggle</strong> - ON/OFF switch with pill indicator</li>
                          <li><strong>Discover Tab</strong> - Main discovery view</li>
                          <li><strong>Token Tabs</strong> - Dynamic tabs for opened tokens (with close button)</li>
                          <li><strong>Network Filter</strong> - Ethereum, Solana, Base, Arbitrum, etc. (shown when tabs ON)</li>
                          <li><strong>Timeframe Filter</strong> - 1H, 24H, 7D, 30D, All Time</li>
                          <li><strong>View Toggle</strong> - Grid view / List view buttons</li>
                        </ul>
                      </div>
                      
                      <div className="outline-nested-item">
                        <strong>Token Display</strong>
                        <ul>
                          <li><strong>Grid View</strong> - Card layout with token info</li>
                          <li><strong>List View</strong> - Table-style layout</li>
                          <li>Token avatar with colored ring</li>
                          <li>Symbol, name, price</li>
                          <li>24H change (color-coded)</li>
                          <li>Volume, market cap</li>
                          <li>Sparkline chart</li>
                          <li>Heart icon (add to watchlist)</li>
                          <li>Click to open token card popup or navigate</li>
                        </ul>
                      </div>
                      
                      <div className="outline-nested-item">
                        <strong>Token Card Popup</strong>
                        <ul>
                          <li>Opens when clicking token (if tabs ON)</li>
                          <li>Token header with logo, symbol, name</li>
                          <li>Timeframe tabs (1m, 30m, 1h, 1d, All Time, 24h, 7d, 30d)</li>
                          <li>Chart toolbar (Indicators, Drawing, Settings)</li>
                          <li>Sparkline chart with gradient fill</li>
                          <li>Bottom tabs: TradingView / Screener</li>
                          <li>TradingView tab: Project description, links</li>
                          <li>Screener tab: Token list view</li>
                          <li>"View full details" button (navigates to token view)</li>
                        </ul>
                      </div>
                      
                      <div className="outline-nested-item">
                        <strong>Compare Mode</strong>
                        <ul>
                          <li>Compare button in quick actions</li>
                          <li>Select 2-4 tokens to compare</li>
                          <li>Compare floating bar at bottom</li>
                          <li>Compare modal with side-by-side analysis</li>
                          <li>Exit compare mode button</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="outline-item">
                  <div className="outline-item-header">
                    <span className="outline-item-icon">📈</span>
                    <strong>Chain Volume Bar Component</strong>
                  </div>
                  <div className="outline-item-details">
                    <ul>
                      <li>Real-time network dominance visualization</li>
                      <li>Shows volume by chain (Ethereum, Solana, BSC, Base)</li>
                      <li>Timeframe selector (6h, 12h, 24h, 48h)</li>
                      <li>Hourly volume bars</li>
                      <li>Current hour dominance indicator</li>
                      <li>Chain rankings</li>
                      <li>Narrative detection (e.g., "Blue Chips", "High Beta Plays")</li>
                    </ul>
                  </div>
                </div>
                
                <div className="outline-item">
                  <div className="outline-item-header">
                    <span className="outline-item-icon">💎</span>
                    <strong>Smart Money Pulse Component</strong>
                  </div>
                  <div className="outline-item-details">
                    <ul>
                      <li>Alpha wallet tracking</li>
                      <li>Smart money activity feed</li>
                      <li>Top alpha wallets grid</li>
                      <li>Wallet rankings and stats</li>
                      <li>Real-time trade monitoring</li>
                    </ul>
                  </div>
                </div>
                
                <div className="outline-item">
                  <div className="outline-item-header">
                    <span className="outline-item-icon">🤖</span>
                    <strong>AI Intelligence Section</strong>
                  </div>
                  <div className="outline-item-details">
                    <div className="outline-nested">
                      <div className="outline-nested-item">
                        <strong>Header</strong>
                        <ul>
                          <li>LIVE/PAUSED badge with pulse animation</li>
                          <li>Title: "AI Intelligence"</li>
                          <li>Category filters (All, DeFi, Meme, NFT, etc.)</li>
                        </ul>
                      </div>
                      
                      <div className="outline-nested-item">
                        <strong>Content</strong>
                        <ul>
                          <li>AI-generated market insights</li>
                          <li>Token recommendations</li>
                          <li>Category-based filtering</li>
                          <li>Real-time updates</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="outline-item">
                  <div className="outline-item-header">
                    <span className="outline-item-icon">⚡</span>
                    <strong>Quick Actions Section</strong>
                  </div>
                  <div className="outline-item-details">
                    <ul>
                      <li><strong>Search</strong> - Opens search modal (⌘K shortcut)</li>
                      <li><strong>Compare</strong> - Toggle compare mode</li>
                      <li><strong>Alerts</strong> - Coming soon badge</li>
                      <li><strong>Portfolio</strong> - Coming soon badge</li>
                    </ul>
                  </div>
                </div>
                
                <div className="outline-item">
                  <div className="outline-item-header">
                    <span className="outline-item-icon">🔄</span>
                    <strong>Compare Mode Features</strong>
                  </div>
                  <div className="outline-item-details">
                    <ul>
                      <li>Compare floating bar (shows selected tokens)</li>
                      <li>Compare modal with side-by-side token analysis</li>
                      <li>Cancel and Compare buttons</li>
                      <li>Token selection counter</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Component Hierarchy */}
        <section className="structure-guide-section">
          <h2 className="structure-guide-section-title">Component Hierarchy</h2>
          <p className="structure-guide-section-desc">
            Visual representation of component relationships and data flow.
          </p>
          
          <div className="structure-guide-hierarchy">
            <div className="hierarchy-tree">
              <div className="hierarchy-node root">
                <div className="hierarchy-node-label">App.jsx</div>
                <div className="hierarchy-node-children">
                  <div className="hierarchy-node">
                    <div className="hierarchy-node-label">Header.jsx</div>
                    <div className="hierarchy-node-children">
                      <div className="hierarchy-node leaf">
                        <div className="hierarchy-node-label">Market Toggle</div>
                      </div>
                      <div className="hierarchy-node leaf">
                        <div className="hierarchy-node-label">SCREENER Button</div>
                      </div>
                    </div>
                  </div>
                  <div className="hierarchy-node">
                    <div className="hierarchy-node-label">WelcomePage.jsx</div>
                    <div className="hierarchy-node-children">
                      <div className="hierarchy-node leaf">
                        <div className="hierarchy-node-label">Fear & Greed</div>
                      </div>
                      <div className="hierarchy-node leaf">
                        <div className="hierarchy-node-label">Alt Season</div>
                      </div>
                      <div className="hierarchy-node leaf">
                        <div className="hierarchy-node-label">Market Dominance</div>
                      </div>
                    </div>
                  </div>
                  <div className="hierarchy-node">
                    <div className="hierarchy-node-label">Token View</div>
                    <div className="hierarchy-node-children">
                      <div className="hierarchy-node leaf">
                        <div className="hierarchy-node-label">TradingChart.jsx</div>
                      </div>
                      <div className="hierarchy-node leaf">
                        <div className="hierarchy-node-label">DataTabs.jsx</div>
                      </div>
                      <div className="hierarchy-node leaf">
                        <div className="hierarchy-node-label">RightPanel.jsx</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default StructureGuidePage
