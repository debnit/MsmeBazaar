import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  CircularProgress,
  Alert,
  Avatar,
  Rating,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton,
  Badge,
  LinearProgress,
  Fab
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  LocationOn,
  Business,
  TrendingUp,
  Star,
  Refresh,
  FilterList,
  Share,
  Bookmark,
  Phone,
  Email,
  Language,
  AttachMoney,
  Group,
  Timeline,
  LocalShipping,
  Security,
  CheckCircle,
  Info
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  transition: 'all 0.3s ease-in-out',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8]
  }
}));

const MatchScoreBar = styled(Box)(({ theme }) => ({
  width: '100%',
  height: 8,
  backgroundColor: theme.palette.grey[200],
  borderRadius: 4,
  overflow: 'hidden'
}));

const MatchScoreFill = styled(Box)<{ score: number }>(({ theme, score }) => ({
  height: '100%',
  borderRadius: 4,
  background: score >= 0.8 
    ? 'linear-gradient(45deg, #4caf50, #81c784)'
    : score >= 0.6 
    ? 'linear-gradient(45deg, #ff9800, #ffb74d)'
    : 'linear-gradient(45deg, #f44336, #e57373)',
  width: `${score * 100}%`,
  transition: 'width 0.5s ease-in-out'
}));

const FilterChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  '&.active': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText
  }
}));

interface MatchResult {
  matched_entity: any;
  match_score: number;
  match_reasons: string[];
  compatibility_factors: Record<string, number>;
  distance_km?: number;
  recommendation_rank: number;
}

interface MatchingResponse {
  matches: MatchResult[];
  total_candidates: number;
  algorithm_used: string;
  matching_criteria: Record<string, any>;
  timestamp: string;
}

interface TransactionMatchingProps {
  entityId: number;
  entityType: 'msme' | 'buyer' | 'investor';
  defaultMatchType?: 'buyer' | 'investor' | 'partner' | 'supplier';
}

const TransactionMatching: React.FC<TransactionMatchingProps> = ({
  entityId,
  entityType,
  defaultMatchType = 'buyer'
}) => {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchType, setMatchType] = useState(defaultMatchType);
  const [filters, setFilters] = useState({
    min_turnover: '',
    max_turnover: '',
    state: '',
    industry: '',
    max_distance: 500
  });
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [savedMatches, setSavedMatches] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'score' | 'distance' | 'rank'>('score');

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const requestBody = {
        entity_id: entityId,
        entity_type: entityType,
        match_type: matchType,
        criteria: {},
        limit: 20,
        filters: Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== null)
        )
      };

      const response = await fetch('/api/transaction_match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }

      const data: MatchingResponse = await response.json();
      setMatches(data.matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, matchType, filters]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      min_turnover: '',
      max_turnover: '',
      state: '',
      industry: '',
      max_distance: 500
    });
  };

  const toggleSaveMatch = (matchIndex: number) => {
    setSavedMatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(matchIndex)) {
        newSet.delete(matchIndex);
      } else {
        newSet.add(matchIndex);
      }
      return newSet;
    });
  };

  const sortMatches = (matches: MatchResult[]) => {
    return [...matches].sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.match_score - a.match_score;
        case 'distance':
          return (a.distance_km || 0) - (b.distance_km || 0);
        case 'rank':
          return a.recommendation_rank - b.recommendation_rank;
        default:
          return 0;
      }
    });
  };

  const getMatchTypeLabel = (type: string) => {
    const labels = {
      buyer: 'Potential Buyers',
      investor: 'Potential Investors',
      partner: 'Business Partners',
      supplier: 'Suppliers'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return '#4caf50';
    if (score >= 0.6) return '#ff9800';
    return '#f44336';
  };

  const getIndustryIcon = (industry: string) => {
    const icons = {
      manufacturing: '🏭',
      technology: '💻',
      healthcare: '🏥',
      agriculture: '🌾',
      textiles: '🧵',
      food_processing: '🍽️',
      consulting: '💼',
      logistics: '🚚'
    };
    return icons[industry as keyof typeof icons] || '🏢';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact'
    }).format(amount);
  };

  const sortedMatches = sortMatches(matches);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {getMatchTypeLabel(matchType)}
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Find the best matches for your business using our AI-powered matching algorithm
        </Typography>
      </Box>

      {/* Match Type Selection */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Match Type
        </Typography>
        <Grid container spacing={1}>
          {['buyer', 'investor', 'partner', 'supplier'].map((type) => (
            <Grid item key={type}>
              <FilterChip
                label={getMatchTypeLabel(type)}
                onClick={() => setMatchType(type as any)}
                className={matchType === type ? 'active' : ''}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Filters */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList />
            <Typography variant="h6">Advanced Filters</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Min Annual Turnover"
                type="number"
                fullWidth
                value={filters.min_turnover}
                onChange={(e) => handleFilterChange('min_turnover', e.target.value)}
                InputProps={{
                  startAdornment: '₹'
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Max Annual Turnover"
                type="number"
                fullWidth
                value={filters.max_turnover}
                onChange={(e) => handleFilterChange('max_turnover', e.target.value)}
                InputProps={{
                  startAdornment: '₹'
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>State</InputLabel>
                <Select
                  value={filters.state}
                  onChange={(e) => handleFilterChange('state', e.target.value)}
                  label="State"
                >
                  <MenuItem value="">All States</MenuItem>
                  <MenuItem value="Maharashtra">Maharashtra</MenuItem>
                  <MenuItem value="Gujarat">Gujarat</MenuItem>
                  <MenuItem value="Tamil Nadu">Tamil Nadu</MenuItem>
                  <MenuItem value="Karnataka">Karnataka</MenuItem>
                  <MenuItem value="Delhi">Delhi</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Industry</InputLabel>
                <Select
                  value={filters.industry}
                  onChange={(e) => handleFilterChange('industry', e.target.value)}
                  label="Industry"
                >
                  <MenuItem value="">All Industries</MenuItem>
                  <MenuItem value="manufacturing">Manufacturing</MenuItem>
                  <MenuItem value="technology">Technology</MenuItem>
                  <MenuItem value="healthcare">Healthcare</MenuItem>
                  <MenuItem value="agriculture">Agriculture</MenuItem>
                  <MenuItem value="textiles">Textiles</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>
                Maximum Distance: {filters.max_distance} km
              </Typography>
              <Slider
                value={filters.max_distance}
                onChange={(_, value) => handleFilterChange('max_distance', value)}
                min={50}
                max={2000}
                step={50}
                marks={[
                  { value: 50, label: '50km' },
                  { value: 500, label: '500km' },
                  { value: 1000, label: '1000km' },
                  { value: 2000, label: '2000km' }
                ]}
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button onClick={clearFilters} variant="outlined">
                  Clear Filters
                </Button>
                <Button onClick={fetchMatches} variant="contained">
                  Apply Filters
                </Button>
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Sort Options */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {sortedMatches.length} matches found
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            label="Sort by"
          >
            <MenuItem value="score">Match Score</MenuItem>
            <MenuItem value="distance">Distance</MenuItem>
            <MenuItem value="rank">Recommendation Rank</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Matches List */}
      {!loading && !error && sortedMatches.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No matches found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your filters or match type
          </Typography>
        </Paper>
      )}

      {sortedMatches.map((match, index) => (
        <StyledCard key={index} onClick={() => setExpandedMatch(expandedMatch === index ? null : index)}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              {/* Entity Avatar */}
              <Avatar 
                sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}
              >
                {getIndustryIcon(match.matched_entity.industry_category)}
              </Avatar>

              {/* Main Content */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {match.matched_entity.company_name || match.matched_entity.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`#${match.recommendation_rank}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSaveMatch(index);
                      }}
                      color={savedMatches.has(index) ? 'primary' : 'default'}
                    >
                      <Bookmark />
                    </IconButton>
                  </Box>
                </Box>

                {/* Match Score */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Match Score
                    </Typography>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      color={getScoreColor(match.match_score)}
                    >
                      {(match.match_score * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                  <MatchScoreBar>
                    <MatchScoreFill score={match.match_score} />
                  </MatchScoreBar>
                </Box>

                {/* Key Information */}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Business fontSize="small" color="action" />
                      <Typography variant="body2">
                        {match.matched_entity.industry_category}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">
                        {match.matched_entity.location?.city}, {match.matched_entity.location?.state}
                        {match.distance_km && (
                          <span style={{ color: '#666' }}> ({match.distance_km.toFixed(0)} km)</span>
                        )}
                      </Typography>
                    </Box>
                  </Grid>
                  {match.matched_entity.annual_turnover && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <AttachMoney fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatCurrency(match.matched_entity.annual_turnover)} annual turnover
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {match.matched_entity.employee_count && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Group fontSize="small" color="action" />
                        <Typography variant="body2">
                          {match.matched_entity.employee_count} employees
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>

                {/* Match Reasons */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Why this is a good match:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {match.match_reasons.slice(0, 3).map((reason, reasonIndex) => (
                      <Chip
                        key={reasonIndex}
                        label={reason}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    ))}
                    {match.match_reasons.length > 3 && (
                      <Chip
                        label={`+${match.match_reasons.length - 3} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Expanded Details */}
            {expandedMatch === index && (
              <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom>
                  Detailed Compatibility Analysis
                </Typography>
                
                {/* Compatibility Factors */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {Object.entries(match.compatibility_factors).map(([factor, score]) => (
                    <Grid item xs={12} md={6} key={factor}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {factor.replace('_', ' ')}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {((score as number) * 100).toFixed(0)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(score as number) * 100}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* All Match Reasons */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    All Match Reasons:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {match.match_reasons.map((reason, reasonIndex) => (
                      <Chip
                        key={reasonIndex}
                        label={reason}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>

                {/* Additional Details */}
                {match.matched_entity.certifications && match.matched_entity.certifications.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      Certifications:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {match.matched_entity.certifications.map((cert: string, certIndex: number) => (
                        <Chip
                          key={certIndex}
                          label={cert}
                          size="small"
                          icon={<Security />}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {match.matched_entity.exports && (
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label="Export Experience"
                      color="primary"
                      icon={<LocalShipping />}
                      variant="outlined"
                    />
                  </Box>
                )}

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<Phone />}
                    size="small"
                  >
                    Contact
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Info />}
                    size="small"
                  >
                    View Profile
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Share />}
                    size="small"
                  >
                    Share
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </StyledCard>
      ))}

      {/* Refresh FAB */}
      <Fab
        color="primary"
        onClick={fetchMatches}
        disabled={loading}
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <Refresh />
      </Fab>
    </Box>
  );
};

export default TransactionMatching;