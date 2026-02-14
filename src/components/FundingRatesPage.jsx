import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import FundingRatesHeatmap from './FundingRatesHeatmap';
import { useFundingRates } from '../hooks/useFundingRates';
import spectreIcons from '../icons/spectreIcons';
import './FundingRatesPage.css';

export default function FundingRatesPage({ dayMode, onBack, marketMode }) {
  const { t } = useTranslation();
  const { fundingRates, loading, error, lastUpdated, refresh } = useFundingRates();
  const [searchQuery, setSearchQuery] = useState('');
  const [rateFilter, setRateFilter] = useState('all'); // 'all', 'positive', 'negative', 'extreme'
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap', 'table'

  const filteredData = useMemo(() => {
    let data = [...fundingRates];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = data.filter(item => 
        item.symbol.toLowerCase().includes(query)
      );
    }

    // Apply rate filter
    switch (rateFilter) {
      case 'positive':
        data = data.filter(item => item.lastFundingRate > 0);
        break;
      case 'negative':
        data = data.filter(item => item.lastFundingRate < 0);
        break;
      case 'extreme':
        data = data.filter(item => Math.abs(item.lastFundingRate) >= 0.1);
        break;
      default:
        break;
    }

    return data;
  }, [fundingRates, searchQuery, rateFilter]);

  const stats = useMemo(() => {
    if (!fundingRates.length) return null;

    const highestPositive = fundingRates.reduce((max, item) => 
      item.lastFundingRate > max.lastFundingRate ? item : max
    , fundingRates[0]);

    const highestNegative = fundingRates.reduce((min, item) => 
      item.lastFundingRate < min.lastFundingRate ? item : min
    , fundingRates[0]);

    const avgRate = fundingRates.reduce((sum, item) => sum + item.lastFundingRate, 0) / fundingRates.length;

    return {
      total: fundingRates.length,
      positive: fundingRates.filter(item => item.lastFundingRate > 0).length,
      negative: fundingRates.filter(item => item.lastFundingRate < 0).length,
      highestPositive,
      highestNegative,
      avgRate,
    };
  }, [fundingRates]);

  const handleSymbolClick = (item) => {
    // Could navigate to token page or show detailed view
    console.log('Clicked symbol:', item.symbol);
  };

  return (
    <div className={`funding-rates-page ${dayMode ? 'day-mode' : ''}`}>
      <div className="funding-rates-header">
        <button className="funding-rates-back" onClick={onBack}>
          {spectreIcons.arrowLeft}
          <span>{t('common.back')}</span>
        </button>
        <h1 className="funding-rates-title">
          {spectreIcons.bank}
          {t('fundingRates.title', 'Funding Rates Heatmap')}
        </h1>
        <div className="funding-rates-actions">
          <button 
            className="funding-rates-refresh" 
            onClick={refresh}
            disabled={loading}
            title="Refresh data"
          >
            <span className={loading ? 'spinning' : ''}>{spectreIcons.refresh}</span>
          </button>
        </div>
      </div>

      {stats && (
        <div className="funding-rates-stats">
          <div className="funding-stat-card">
            <span className="funding-stat-label">{t('fundingRates.totalPairs', 'Total Pairs')}</span>
            <span className="funding-stat-value">{stats.total}</span>
          </div>
          <div className="funding-stat-card positive">
            <span className="funding-stat-label">{t('fundingRates.longsPay', 'Longs Pay')}</span>
            <span className="funding-stat-value">{stats.positive}</span>
          </div>
          <div className="funding-stat-card negative">
            <span className="funding-stat-label">{t('fundingRates.shortsPay', 'Shorts Pay')}</span>
            <span className="funding-stat-value">{stats.negative}</span>
          </div>
          <div className="funding-stat-card">
            <span className="funding-stat-label">{t('fundingRates.avgRate', 'Avg Rate')}</span>
            <span className="funding-stat-value">
              {stats.avgRate > 0 ? '+' : ''}{stats.avgRate.toFixed(4)}%
            </span>
          </div>
          {stats.highestPositive && (
            <div className="funding-stat-card extreme-positive">
              <span className="funding-stat-label">{t('fundingRates.highestLong', 'Highest Long')}</span>
              <span className="funding-stat-value">
                {stats.highestPositive.symbol.replace('USDT', '').replace('USD', '')}: +{stats.highestPositive.lastFundingRate.toFixed(4)}%
              </span>
            </div>
          )}
          {stats.highestNegative && (
            <div className="funding-stat-card extreme-negative">
              <span className="funding-stat-label">{t('fundingRates.highestShort', 'Highest Short')}</span>
              <span className="funding-stat-value">
                {stats.highestNegative.symbol.replace('USDT', '').replace('USD', '')}: {stats.highestNegative.lastFundingRate.toFixed(4)}%
              </span>
            </div>
          )}
        </div>
      )}

      <div className="funding-rates-toolbar">
        <div className="funding-rates-search">
          <span className="funding-search-icon">{spectreIcons.search}</span>
          <input
            type="text"
            placeholder={t('fundingRates.searchPlaceholder', 'Search symbol...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="funding-search-clear"
              onClick={() => setSearchQuery('')}
            >
              {spectreIcons.close}
            </button>
          )}
        </div>

        <div className="funding-rates-filters">
          <select 
            value={rateFilter} 
            onChange={(e) => setRateFilter(e.target.value)}
            className="funding-filter-select"
          >
            <option value="all">{t('fundingRates.allRates', 'All Rates')}</option>
            <option value="positive">{t('fundingRates.positiveOnly', 'Positive Only (Longs Pay)')}</option>
            <option value="negative">{t('fundingRates.negativeOnly', 'Negative Only (Shorts Pay)')}</option>
            <option value="extreme">{t('fundingRates.extremeOnly', 'Extreme (>0.1%)')}</option>
          </select>
        </div>

        <div className="funding-rates-view-toggle">
          <button 
            className={viewMode === 'heatmap' ? 'active' : ''}
            onClick={() => setViewMode('heatmap')}
          >
            {spectreIcons.grid}
            {t('fundingRates.heatmap', 'Heatmap')}
          </button>
          <button 
            className={viewMode === 'table' ? 'active' : ''}
            onClick={() => setViewMode('table')}
          >
            {spectreIcons.list}
            {t('fundingRates.table', 'Table')}
          </button>
        </div>
      </div>

      {lastUpdated && (
        <div className="funding-rates-meta">
          <span className="funding-last-updated">
            {t('fundingRates.lastUpdated', 'Last updated')}: {lastUpdated.toLocaleTimeString()}
          </span>
          <span className="funding-source">{t('fundingRates.source', 'Source')}: Binance Futures</span>
        </div>
      )}

      {error && (
        <div className="funding-rates-error">
          <p>{t('fundingRates.error', 'Error loading data')}: {error}</p>
          <button onClick={refresh}>{t('common.retry')}</button>
        </div>
      )}

      <div className="funding-rates-content">
        {viewMode === 'heatmap' ? (
          <FundingRatesHeatmap 
            data={filteredData} 
            onSymbolClick={handleSymbolClick}
          />
        ) : (
          <div className="funding-rates-table-container">
            <table className="funding-rates-table">
              <thead>
                <tr>
                  <th>{t('fundingRates.symbol', 'Symbol')}</th>
                  <th>{t('fundingRates.markPrice', 'Mark Price')}</th>
                  <th>{t('fundingRates.indexPrice', 'Index Price')}</th>
                  <th>{t('fundingRates.lastRate', 'Last Funding')}</th>
                  <th>{t('fundingRates.8hProjection', '8h Projection')}</th>
                  <th>{t('fundingRates.dailyProjection', 'Daily Projection')}</th>
                  <th>{t('fundingRates.annualized', 'Annualized')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr 
                    key={item.symbol}
                    className={item.lastFundingRate > 0 ? 'positive' : item.lastFundingRate < 0 ? 'negative' : ''}
                  >
                    <td className="funding-symbol">{item.symbol}</td>
                    <td className="funding-price">${item.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                    <td className="funding-price">${item.indexPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                    <td className={`funding-rate ${item.lastFundingRate > 0 ? 'positive' : 'negative'}`}>
                      {item.lastFundingRate > 0 ? '+' : ''}{item.lastFundingRate.toFixed(4)}%
                    </td>
                    <td className={`funding-rate ${item.projection8h > 0 ? 'positive' : 'negative'}`}>
                      {item.projection8h > 0 ? '+' : ''}{item.projection8h.toFixed(3)}%
                    </td>
                    <td className={`funding-rate ${item.projection24h > 0 ? 'positive' : 'negative'}`}>
                      {item.projection24h > 0 ? '+' : ''}{item.projection24h.toFixed(3)}%
                    </td>
                    <td className={`funding-rate ${item.annualizedRate > 0 ? 'positive' : 'negative'}`}>
                      {item.annualizedRate > 0 ? '+' : ''}{item.annualizedRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && !loading && (
              <div className="funding-rates-no-results">
                {t('fundingRates.noResults', 'No funding rates match your filters')}
              </div>
            )}
          </div>
        )}
      </div>

      {loading && filteredData.length === 0 && (
        <div className="funding-rates-loading">
          <div className="funding-loading-spinner" />
          <p>{t('fundingRates.loading', 'Loading funding rates...')}</p>
        </div>
      )}
    </div>
  );
}
