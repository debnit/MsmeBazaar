import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Button,
  IconButton,
  Avatar,
  Rating,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Tooltip,
  Badge,
  LinearProgress,
  Snackbar,
  Switch,
  FormControlLabel,
  Divider,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material';
import {
  ThumbUp,
  ThumbDown,
  Bookmark,
  BookmarkBorder,
  Share,
  Info,
  Refresh,
  FilterList,
  TrendingUp,
  Psychology,
  Shuffle,
  Star,
  StarBorder,
  Visibility,
  Phone,
  Email,
  LocationOn,
  Business,
  AttachMoney,
  Group,
  CheckCircle,
  Cancel,
  Settings,
  History,
  Analytics,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledRecommendationCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease-in-out',
  cursor: 'pointer',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[12],
    '& .recommendation-actions': {
      opacity: 1,
    },
  },
}));

const RecommendationActions = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  display: 'flex',
  gap: theme.spacing(0.5),
  opacity: 0,
  transition: 'opacity 0.3s ease-in-out',
  '& .MuiIconButton-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(4px)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
  },
}));

const ScoreBar = styled(Box)(({ theme }) => ({
  width: '100%',
  height: 6,
  backgroundColor: theme.palette.grey[200],
  borderRadius: 3,
  overflow: 'hidden',
}));

const ScoreFill = styled(Box)<{ score: number }>(({ theme, score }) => ({
  height: '100%',
  borderRadius: 3,
  background: score >= 0.8
    ? 'linear-gradient(45deg, #4caf50, #66bb6a)'
    : score >= 0.6
      ? 'linear-gradient(45deg, #ff9800, #ffb74d)'
      : 'linear-gradient(45deg, #f44336, #ef5350)',
  width: `${score * 100}%`,
  transition: 'width 0.5s ease-in-out',
}));

const AlgorithmChip = styled(Chip)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  left: theme.spacing(1),
  fontSize: '0.7rem',
  height: 20,
}));

interface RecommendationItem {
  item_id: number;
  item_type: string;
  title: string;
  description: string;
  score: float;
  confidence: float;
  reasons: string[];
  metadata: Record<string, any>;
  rank: number;
}

interface RecommendationResponse {
  recommendations: RecommendationItem[];
  algorithm_used: string;
  personalization_score: float;
  diversity_score: float;
  novelty_score: float;
  timestamp: string;
  user_context: Record<string, any>;
}

interface RecommendationEngineProps {
  userId: number;
  entityType?: 'msme' | 'product' | 'service' | 'buyer' | 'investor';
  defaultRecommendationType?: 'collaborative' | 'content_based' | 'hybrid' | 'similar_users';
  limit?: number;
  showFilters?: boolean;
  showFeedback?: boolean;
  compact?: boolean;
}

const RecommendationEngine: React.FC<RecommendationEngineProps> = ({
  userId,
  entityType = 'msme',
  defaultRecommendationType = 'hybrid',
  limit = 12,
  showFilters = true,
  showFeedback = true,
  compact = false,
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendationType, setRecommendationType] = useState(defaultRecommendationType);
  const [savedItems, setSavedItems] = useState<Set<number>>(new Set());
  const [likedItems, setLikedItems] = useState<Set<number>>(new Set());
  const [dislikedItems, setDislikedItems] = useState<Set<number>>(new Set());
  const [selectedTab, setSelectedTab] = useState(0);
  const [detailsDialog, setDetailsDialog] = useState<RecommendationItem | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState<RecommendationItem | null>(null);
  const [explicitRating, setExplicitRating] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'warning' | 'info' });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [personalizedMode, setPersonalizedMode] = useState(true);
  const [algorithmMetrics, setAlgorithmMetrics] = useState<any>(null);

  // Recommendation types and their descriptions
  const recommendationTypes = {
    collaborative: {
      label: 'Collaborative Filtering',
      description: 'Based on users with similar preferences',
      icon: <Group />,
    },
    content_based: {
      label: 'Content-Based',
      description: 'Based on item characteristics you liked',
      icon: <Psychology />,
    },
    hybrid: {
      label: 'Hybrid (Smart)',
      description: 'Combines multiple algorithms for best results',
      icon: <TrendingUp />,
    },
    similar_users: {
      label: 'Similar Users',
      description: 'Based on advanced user behavior patterns',
      icon: <Analytics />,
    },
  };

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const requestBody = {
        user_id: userId,
        entity_type: entityType,
        recommendation_type: recommendationType,
        limit: limit,
        filters: {},
        context: {
          timestamp: new Date().toISOString(),
          personalized: personalizedMode,
        },
      };

      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data: RecommendationResponse = await response.json();
      setRecommendations(data.recommendations);
      setAlgorithmMetrics({
        algorithm_used: data.algorithm_used,
        personalization_score: data.personalization_score,
        diversity_score: data.diversity_score,
        novelty_score: data.novelty_score,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId, entityType, recommendationType, limit, personalizedMode]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchRecommendations, 60000); // Refresh every minute
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, fetchRecommendations]);

  const handleFeedback = async (item: RecommendationItem, feedbackType: string, rating?: number) => {
    try {
      const feedbackData = {
        user_id: userId,
        item_id: item.item_id,
        item_type: item.item_type,
        feedback_type: feedbackType,
        explicit_rating: rating,
        implicit_score: feedbackType === 'like' ? 1.0 : feedbackType === 'dislike' ? 0.0 : 0.5,
        session_id: `session_${Date.now()}`,
        context: {
          recommendation_algorithm: algorithmMetrics?.algorithm_used,
          recommendation_rank: item.rank,
          recommendation_score: item.score,
        },
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error('Failed to record feedback');
      }

      // Update local state
      if (feedbackType === 'like') {
        setLikedItems(prev => new Set([...prev, item.item_id]));
        setDislikedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.item_id);
          return newSet;
        });
      } else if (feedbackType === 'dislike') {
        setDislikedItems(prev => new Set([...prev, item.item_id]));
        setLikedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.item_id);
          return newSet;
        });
      } else if (feedbackType === 'bookmark') {
        setSavedItems(prev => {
          const newSet = new Set(prev);
          if (newSet.has(item.item_id)) {
            newSet.delete(item.item_id);
          } else {
            newSet.add(item.item_id);
          }
          return newSet;
        });
      }

      setSnackbar({
        open: true,
        message: 'Feedback recorded! This helps improve your recommendations.',
        severity: 'success',
      });

    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to record feedback',
        severity: 'error',
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) {return '#4caf50';}
    if (score >= 0.6) {return '#ff9800';}
    return '#f44336';
  };

  const getIndustryIcon = (industry: string) => {
    const icons: Record<string, string> = {
      manufacturing: '🏭',
      technology: '💻',
      healthcare: '🏥',
      agriculture: '🌾',
      textiles: '🧵',
      food_processing: '🍽️',
      consulting: '💼',
      logistics: '🚚',
    };
    return icons[industry] || '🏢';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
    }).format(amount);
  };

  const renderRecommendationCard = (item: RecommendationItem) => (
    <Grid item xs={12} sm={compact ? 12 : 6} md={compact ? 6 : 4} key={item.item_id}>
      <StyledRecommendationCard>
        <AlgorithmChip
          label={algorithmMetrics?.algorithm_used || 'AI'}
          size="small"
          color="primary"
          variant="outlined"
        />

        <RecommendationActions className="recommendation-actions">
          <Tooltip title={savedItems.has(item.item_id) ? 'Remove bookmark' : 'Bookmark'}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleFeedback(item, 'bookmark');
              }}
              color={savedItems.has(item.item_id) ? 'primary' : 'default'}
            >
              {savedItems.has(item.item_id) ? <Bookmark /> : <BookmarkBorder />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Like">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleFeedback(item, 'like');
              }}
              color={likedItems.has(item.item_id) ? 'success' : 'default'}
            >
              <ThumbUp />
            </IconButton>
          </Tooltip>

          <Tooltip title="Dislike">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleFeedback(item, 'dislike');
              }}
              color={dislikedItems.has(item.item_id) ? 'error' : 'default'}
            >
              <ThumbDown />
            </IconButton>
          </Tooltip>
        </RecommendationActions>

        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 48, height: 48 }}>
              {getIndustryIcon(item.metadata?.industry)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
                {item.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Rank #{item.rank} • {(item.confidence * 100).toFixed(0)}% confidence
              </Typography>
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
                color={getScoreColor(item.score)}
              >
                {(item.score * 100).toFixed(0)}%
              </Typography>
            </Box>
            <ScoreBar>
              <ScoreFill score={item.score} />
            </ScoreBar>
          </Box>

          {/* Key Information */}
          {item.metadata && (
            <Box sx={{ mb: 2 }}>
              {item.metadata.industry && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Business fontSize="small" color="action" />
                  <Typography variant="body2">{item.metadata.industry}</Typography>
                </Box>
              )}

              {item.metadata.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="body2">{item.metadata.location}</Typography>
                </Box>
              )}

              {item.metadata.annual_turnover && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AttachMoney fontSize="small" color="action" />
                  <Typography variant="body2">
                    {formatCurrency(item.metadata.annual_turnover)} revenue
                  </Typography>
                </Box>
              )}

              {item.metadata.employee_count && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Group fontSize="small" color="action" />
                  <Typography variant="body2">
                    {item.metadata.employee_count} employees
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.description}
          </Typography>

          {/* Reasons */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Why recommended:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {item.reasons.slice(0, 3).map((reason, index) => (
                <Chip
                  key={index}
                  label={reason}
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              ))}
              {item.reasons.length > 3 && (
                <Chip
                  label={`+${item.reasons.length - 3} more`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              )}
            </Box>
          </Box>
        </CardContent>

        <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
          <Button
            size="small"
            startIcon={<Info />}
            onClick={() => setDetailsDialog(item)}
          >
            Details
          </Button>
          <Button
            size="small"
            startIcon={<Phone />}
            onClick={() => handleFeedback(item, 'contact')}
          >
            Contact
          </Button>
          {showFeedback && (
            <Button
              size="small"
              startIcon={<Star />}
              onClick={() => setFeedbackDialog(item)}
            >
              Rate
            </Button>
          )}
        </CardActions>
      </StyledRecommendationCard>
    </Grid>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Personalized Recommendations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          AI-powered suggestions tailored just for you
        </Typography>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Tabs
              value={selectedTab}
              onChange={(_, newValue) => {
                setSelectedTab(newValue);
                const types = Object.keys(recommendationTypes);
                setRecommendationType(types[newValue] as any);
              }}
              variant="scrollable"
              scrollButtons="auto"
            >
              {Object.entries(recommendationTypes).map(([key, config]) => (
                <Tab
                  key={key}
                  label={config.label}
                  icon={config.icon}
                  iconPosition="start"
                  sx={{ minHeight: 48 }}
                />
              ))}
            </Tabs>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={personalizedMode}
                    onChange={(e) => setPersonalizedMode(e.target.checked)}
                  />
                }
                label="Personalized"
                sx={{ mr: 1 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                }
                label="Auto-refresh"
                sx={{ mr: 1 }}
              />

              <Tooltip title="Refresh recommendations">
                <IconButton
                  onClick={fetchRecommendations}
                  disabled={loading}
                  color="primary"
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>

        {/* Algorithm Description */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {recommendationTypes[recommendationType]?.description}
          </Typography>
        </Box>

        {/* Algorithm Metrics */}
        {algorithmMetrics && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Personalization
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={algorithmMetrics.personalization_score * 100}
                    sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption">
                    {(algorithmMetrics.personalization_score * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Diversity
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={algorithmMetrics.diversity_score * 100}
                    color="secondary"
                    sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption">
                    {(algorithmMetrics.diversity_score * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Novelty
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={algorithmMetrics.novelty_score * 100}
                    color="warning"
                    sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption">
                    {(algorithmMetrics.novelty_score * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid item xs={12} sm={compact ? 12 : 6} md={compact ? 6 : 4} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', mb: 2 }}>
                    <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="80%" />
                      <Skeleton variant="text" width="60%" />
                    </Box>
                  </Box>
                  <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Recommendations Grid */}
      {!loading && !error && (
        <>
          {recommendations.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No recommendations available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try interacting with more items to get personalized recommendations
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {recommendations.map(renderRecommendationCard)}
            </Grid>
          )}
        </>
      )}

      {/* Details Dialog */}
      <Dialog
        open={!!detailsDialog}
        onClose={() => setDetailsDialog(null)}
        maxWidth="md"
        fullWidth
      >
        {detailsDialog && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {getIndustryIcon(detailsDialog.metadata?.industry)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{detailsDialog.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Match Score: {(detailsDialog.score * 100).toFixed(0)}% •
                    Confidence: {(detailsDialog.confidence * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>

            <DialogContent>
              <Typography variant="body1" paragraph>
                {detailsDialog.description}
              </Typography>

              <Typography variant="h6" gutterBottom>
                Why This Was Recommended
              </Typography>
              <Grid container spacing={1} sx={{ mb: 3 }}>
                {detailsDialog.reasons.map((reason, index) => (
                  <Grid item key={index}>
                    <Chip label={reason} variant="outlined" color="primary" />
                  </Grid>
                ))}
              </Grid>

              {detailsDialog.metadata && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Details
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(detailsDialog.metadata).map(([key, value]) => (
                      <Grid item xs={12} sm={6} key={key}>
                        <Typography variant="body2" color="text.secondary">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Typography>
                        <Typography variant="body1">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setDetailsDialog(null)}>Close</Button>
              <Button
                variant="contained"
                startIcon={<Phone />}
                onClick={() => {
                  handleFeedback(detailsDialog, 'contact');
                  setDetailsDialog(null);
                }}
              >
                Contact
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog
        open={!!feedbackDialog}
        onClose={() => setFeedbackDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        {feedbackDialog && (
          <>
            <DialogTitle>Rate This Recommendation</DialogTitle>
            <DialogContent>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {feedbackDialog.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your rating helps us improve recommendations for you
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography component="legend" gutterBottom>
                  How relevant is this recommendation?
                </Typography>
                <Rating
                  value={explicitRating}
                  onChange={(_, newValue) => setExplicitRating(newValue)}
                  size="large"
                />
              </Box>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setFeedbackDialog(null)}>Cancel</Button>
              <Button
                variant="contained"
                disabled={!explicitRating}
                onClick={() => {
                  if (explicitRating && feedbackDialog) {
                    handleFeedback(feedbackDialog, 'rate', explicitRating);
                    setFeedbackDialog(null);
                    setExplicitRating(null);
                  }
                }}
              >
                Submit Rating
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
      />

      {/* Speed Dial for Quick Actions */}
      <SpeedDial
        ariaLabel="Recommendation actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<Refresh />}
          tooltipTitle="Refresh"
          onClick={fetchRecommendations}
        />
        <SpeedDialAction
          icon={<Shuffle />}
          tooltipTitle="Shuffle Algorithm"
          onClick={() => {
            const types = Object.keys(recommendationTypes);
            const currentIndex = types.indexOf(recommendationType);
            const nextIndex = (currentIndex + 1) % types.length;
            setRecommendationType(types[nextIndex] as any);
            setSelectedTab(nextIndex);
          }}
        />
        <SpeedDialAction
          icon={<FilterList />}
          tooltipTitle="Filters"
          onClick={() => {/* Open filters */}}
        />
      </SpeedDial>
    </Box>
  );
};

export default RecommendationEngine;
