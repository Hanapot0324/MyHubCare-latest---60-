import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  CalendarToday as CalendarIcon,
  Book as BookIcon,
  DirectionsRun as RunIcon,
  Medication as MedicationIcon,
  Shield as ShieldIcon,
  AccessTime as TimeIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { API_BASE_URL } from '../config/api';

const Education = ({ socket }) => {
  const [activeTab, setActiveTab] = useState('modules');
  const [modules, setModules] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [forumPosts, setForumPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal states
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  // New post form
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postAnonymously, setPostAnonymously] = useState(true);

  // Sample data
  const defaultModules = [
    {
      id: 1,
      title: 'Understanding HIV',
      description: 'Learn about HIV, how it affects the immune system, and transmission routes.',
      category: 'BASICS',
      readTime: '10 min',
      content: 'HIV (Human Immunodeficiency Virus) is a virus that attacks the body\'s immune system, specifically the CD4 cells (T cells), which help the immune system fight off infections. If left untreated, HIV reduces the number of CD4 cells in the body, making the person more likely to get other infections or infection-related cancers. Over time, HIV can destroy so many of these cells that the body can\'t fight off infections and disease. When this happens, HIV infection leads to AIDS (Acquired Immunodeficiency Syndrome).',
    },
    {
      id: 2,
      title: 'Living with HIV',
      description: 'Daily life management, stigma reduction, and maintaining quality of life.',
      category: 'LIFESTYLE',
      readTime: '15 min',
      content: 'Living with HIV today is very different from what it was decades ago. With proper treatment and care, people with HIV can live long, healthy lives. This module covers daily management strategies, dealing with stigma, maintaining relationships, and improving your overall quality of life.',
    },
    {
      id: 3,
      title: 'Antiretroviral Therapy (ART)',
      description: 'Understanding your medications, adherence importance, and managing side effects.',
      category: 'TREATMENT',
      readTime: '12 min',
      content: 'Antiretroviral Therapy (ART) is the use of HIV medicines to treat HIV infection. People on ART take a combination of HIV medicines (called an HIV treatment regimen) every day. ART is recommended for everyone who has HIV. ART cannot cure HIV, but HIV medicines help people with HIV live longer, healthier lives. ART also reduces the risk of HIV transmission.',
    },
    {
      id: 4,
      title: 'Prevention and Safety',
      description: 'Preventing HIV transmission and protecting others.',
      category: 'PREVENTION',
      readTime: '8 min',
      content: 'HIV prevention involves a combination of strategies including using condoms, taking PrEP (pre-exposure prophylaxis) or PEP (post-exposure prophylaxis), getting tested regularly, and maintaining an undetectable viral load if you\'re living with HIV. This module covers all aspects of HIV prevention and safety.',
    },
  ];

  const defaultFaqs = [
    {
      id: 1,
      question: 'What is the difference between HIV and AIDS?',
      answer: 'HIV (Human Immunodeficiency Virus) is the virus that causes HIV infection. AIDS (Acquired Immunodeficiency Syndrome) is the most advanced stage of HIV infection. HIV attacks and destroys CD4 cells, which are important for the immune system. When the immune system becomes severely damaged, HIV infection progresses to AIDS. Not everyone with HIV will develop AIDS. With proper treatment, people with HIV can live long, healthy lives without ever developing AIDS.',
    },
    {
      id: 2,
      question: 'How effective is ART?',
      answer: 'ART (Antiretroviral Therapy) is highly effective when taken consistently as prescribed. When taken correctly, ART can reduce the amount of HIV in the blood (viral load) to undetectable levels. This means the virus is still present but at such low levels that it cannot be detected by standard tests. People with undetectable viral loads can live long, healthy lives and have effectively no risk of transmitting HIV to their sexual partners.',
    },
    {
      id: 3,
      question: 'What does undetectable = untransmittable mean?',
      answer: 'Undetectable = Untransmittable (U=U) means that people with HIV who achieve and maintain an undetectable viral load (the amount of HIV in the blood) by taking ART as prescribed cannot sexually transmit HIV to others. This is a major scientific breakthrough that has been confirmed by multiple studies. When the viral load is undetectable, the risk of transmission is effectively zero.',
    },
    {
      id: 4,
      question: 'What should I do if I miss a dose?',
      answer: 'If you miss a dose of your HIV medication, take it as soon as you remember. However, if it\'s almost time for your next dose, skip the missed dose and continue with your regular schedule. Do not take a double dose to make up for a missed one. If you frequently miss doses, talk to your healthcare provider about strategies to improve adherence, such as setting reminders or using pill organizers.',
    },
  ];

  const defaultForumPosts = [
    {
      id: 1,
      author: 'Anonymous User',
      title: 'Tips for Managing Side Effects',
      content: 'I wanted to share some tips that have helped me manage medication side effects...',
      replies: 5,
      date: '2 days ago',
    },
    {
      id: 2,
      author: 'Community Member',
      title: 'Staying Positive and Healthy',
      content: 'Here are some daily habits that have improved my quality of life...',
      replies: 12,
      date: '5 days ago',
    },
    {
      id: 3,
      author: 'Support Group',
      title: 'Monthly Virtual Support Meeting',
      content: 'Join us for our monthly virtual support group meeting this Saturday...',
      replies: 8,
      date: '1 week ago',
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadData = () => {
    // Load from localStorage or use defaults
    const storedModules = JSON.parse(localStorage.getItem('educationModules')) || defaultModules;
    const storedFaqs = JSON.parse(localStorage.getItem('faqs')) || defaultFaqs;
    const storedPosts = JSON.parse(localStorage.getItem('forumPosts')) || defaultForumPosts;

    setModules(storedModules);
    setFaqs(storedFaqs);
    setForumPosts(storedPosts);
    setLoading(false);
  };

  // Get module icon - all icons standardized to same size
  const getModuleIcon = (category) => {
    const iconSize = 50; // Standard size for all icons
    
    if (category === 'BASICS') {
      // Three stacked squares in green, red, and light blue
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center', width: iconSize, height: iconSize }}>
          <Box
            sx={{
              width: iconSize * 0.8,
              height: iconSize * 0.6,
              backgroundColor: '#4caf50',
              transform: 'rotate(-5deg)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
          <Box
            sx={{
              width: iconSize * 0.8,
              height: iconSize * 0.6,
              backgroundColor: '#f44336',
              transform: 'rotate(2deg)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
          <Box
            sx={{
              width: iconSize * 0.8,
              height: iconSize * 0.6,
              backgroundColor: '#03a9f4',
              transform: 'rotate(-3deg)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
        </Box>
      );
    }
    if (category === 'TREATMENT') {
      // Pill capsule - red on one side, orange on the other
      return (
        <Box
          sx={{
            width: iconSize,
            height: iconSize * 0.6,
            borderRadius: '15px',
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: '50%',
              height: '100%',
              backgroundColor: '#f44336',
            }}
          />
          <Box
            sx={{
              width: '50%',
              height: '100%',
              backgroundColor: '#ff9800',
            }}
          />
        </Box>
      );
    }
    if (category === 'LIFESTYLE') {
      // Orange running person icon
      return <RunIcon sx={{ fontSize: iconSize, color: '#ff9800' }} />;
    }
    if (category === 'PREVENTION') {
      // Light blue shield icon
      return <ShieldIcon sx={{ fontSize: iconSize, color: '#03a9f4' }} />;
    }
    return <BookIcon sx={{ fontSize: iconSize, color: 'white' }} />;
  };

  // Get module icon color - all cards have blue background according to image
  const getModuleIconColor = (category) => {
    return '#1976d2'; // All cards have blue background
  };

  // Filter modules
  const getFilteredModules = () => {
    if (!searchTerm) return modules;
    return modules.filter(
      (module) =>
        module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // View module
  const handleViewModule = (module) => {
    setSelectedModule(module);
    setShowModuleModal(true);
  };

  // Submit new post
  const handleSubmitPost = () => {
    if (!postTitle || !postContent) {
      setToast({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    const newPost = {
      id: Date.now(),
      author: postAnonymously ? 'Anonymous User' : 'Community Member',
      title: postTitle,
      content: postContent,
      replies: 0,
      date: 'Just now',
    };

    const updatedPosts = [newPost, ...forumPosts];
    setForumPosts(updatedPosts);
    localStorage.setItem('forumPosts', JSON.stringify(updatedPosts));

    // Reset form
    setPostTitle('');
    setPostContent('');
    setPostAnonymously(true);
    setShowNewPostModal(false);

    setToast({ message: 'Your post has been submitted and is pending moderation', type: 'success' });
  };

  // View post
  const handleViewPost = (post) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };

  // Render Learning Modules Tab
  const renderModulesTab = () => {
    const filteredModules = getFilteredModules();

    return (
      <Paper
        sx={{
          p: 3,
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderRadius: '10px',
          border: '1px solid #ffff',
          marginTop: '10px'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#333',
              fontSize: '20px',
            }}
          >
            Interactive Learning Modules
          </Typography>
          <TextField
            size="small"
            placeholder="Search modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: '#666' }} />,
            }}
            sx={{
              minWidth: 250,
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px',
                backgroundColor: 'white',
              },
            }}
          />
        </Box>

       <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              // <-- horizontally center all items
            }}
          >

          {filteredModules.map((module) => (
            <Card
              key={module.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '390px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #e0e0e0',
                width: '280px'
              }}
            >
              <Box
                sx={{
                  backgroundColor: getModuleIconColor(module.category),
                  p: 3,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '120px',
                }}
              >
                {getModuleIcon(module.category)}
              </Box>
              <CardContent
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'white',
                  p: 2.5,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: '#333',
                    mb: 1,
                    fontSize: '18px',
                  }}
                >
                  {module.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#666',
                    mb: 2,
                    flexGrow: 1,
                    fontSize: '14px',
                    lineHeight: 1.6,
                  }}
                >
                  {module.description}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Chip
                    label={module.category}
                    size="small"
                    sx={{
                      backgroundColor: '#e3f2fd',
                      color: '#1565c0',
                      fontWeight: 600,
                      fontSize: '11px',
                      height: '24px',
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#666' }}>
                    <TimeIcon sx={{ fontSize: 16, color: '#666' }} />
                    <Typography variant="body2" sx={{ fontSize: '12px', color: '#666' }}>
                      {module.readTime}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => handleViewModule(module)}
                  sx={{
                    backgroundColor: '#1976d2',
                    color: 'white',
                    textTransform: 'none',
                    fontWeight: 500,
                    borderRadius: '4px',
                    padding: '8px 16px',
                    '&:hover': {
                      backgroundColor: '#1565c0',
                    },
                  }}
                >
                  Start Learning
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>
    );
  };

  // Render FAQs Tab
  const renderFAQsTab = () => {
    return (
      <Paper
        sx={{
          p: 3,
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderRadius: '8px',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: '#333',
            mb: 3,
          }}
        >
          Frequently Asked Questions
        </Typography>

        <Box>
          {faqs.map((faq) => (
            <Accordion
              key={faq.id}
              sx={{
                mb: 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                '&:before': {
                  display: 'none',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: '#f9fafb',
                  '&:hover': {
                    backgroundColor: '#f3f4f6',
                  },
                }}
              >
                <Typography sx={{ fontWeight: 500, color: '#333' }}>{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ color: '#666', lineHeight: 1.8 }}>{faq.answer}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Paper>
    );
  };

  // Render Forum Tab
  const renderForumTab = () => {
    return (
      <Paper
        sx={{
          p: 3,
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderRadius: '8px',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#333',
            }}
          >
            Community Forum
          </Typography>
          <Button
            variant="contained"
            onClick={() => setShowNewPostModal(true)}
            sx={{
              backgroundColor: '#1976d2',
              color: 'white',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: '#1565c0',
              },
            }}
          >
            New Post
          </Button>
        </Box>

        <Box
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: '#e3f2fd',
            borderLeft: '4px solid #1976d2',
            borderRadius: '4px',
          }}
        >
          <Typography sx={{ color: '#333', fontSize: '14px' }}>
            <strong>Community Guidelines:</strong> This is a safe space for sharing experiences and
            support. Please be respectful and maintain confidentiality.
          </Typography>
        </Box>

        <Box>
          {forumPosts.map((post) => (
            <Card
              key={post.id}
              sx={{
                mb: 2,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                borderRadius: '8px',
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 2,
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: '#333',
                        mb: 1,
                        fontSize: '18px',
                      }}
                    >
                      {post.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#666',
                        mb: 2,
                        fontSize: '14px',
                      }}
                    >
                      {post.content}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#666' }}>
                        <PersonIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2" sx={{ fontSize: '12px' }}>
                          {post.author}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#666' }}>
                        <CommentIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2" sx={{ fontSize: '12px' }}>
                          {post.replies} replies
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#666' }}>
                        <CalendarIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2" sx={{ fontSize: '12px' }}>
                          {post.date}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    onClick={() => handleViewPost(post)}
                    sx={{
                      backgroundColor: '#1976d2',
                      color: 'white',
                      textTransform: 'none',
                      fontWeight: 500,
                      '&:hover': {
                        backgroundColor: '#1565c0',
                      },
                    }}
                  >
                    View Discussion
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>
    );
  };

  // Render Module Modal
  const renderModuleModal = () => {
    if (!showModuleModal || !selectedModule) return null;

    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          p: 2,
        }}
      >
        <Paper
          sx={{
            background: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 3,
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
              {selectedModule.title}
            </Typography>
            <Button
              onClick={() => setShowModuleModal(false)}
              sx={{
                minWidth: 'auto',
                p: 1,
                color: '#666',
                '&:hover': {
                  backgroundColor: '#f3f4f6',
                },
              }}
            >
              <CloseIcon />
            </Button>
          </Box>

          <Box sx={{ p: 3 }}>
            <Box
              sx={{
                backgroundColor: getModuleIconColor(selectedModule.category),
                p: 3,
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                mb: 3,
                minHeight: '150px',
              }}
            >
              {getModuleIcon(selectedModule.category)}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
              <Chip
                label={selectedModule.category}
                size="small"
                sx={{
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  fontWeight: 600,
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#666' }}>
                <TimeIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2">{selectedModule.readTime}</Typography>
              </Box>
            </Box>

            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#333',
                mb: 1,
              }}
            >
              {selectedModule.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
              {selectedModule.description}
            </Typography>

            <Accordion defaultExpanded sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 600 }}>Module Content</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ color: '#666', lineHeight: 1.8 }}>
                  {selectedModule.content}
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Box
              sx={{
                p: 2,
                backgroundColor: '#d4edda',
                borderLeft: '4px solid #28a745',
                borderRadius: '4px',
              }}
            >
              <Typography sx={{ fontWeight: 600, color: '#155724', mb: 1 }}>
                Key Takeaways:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2, color: '#155724' }}>
                <li>Understanding is the first step to effective management</li>
                <li>Always consult with your healthcare provider</li>
                <li>You are not alone in this journey</li>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 2,
              p: 3,
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <Button
              variant="outlined"
              onClick={() => setShowModuleModal(false)}
              sx={{
                textTransform: 'none',
                borderColor: '#d0d0d0',
                color: '#333',
              }}
            >
              Close
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setShowModuleModal(false);
                setToast({ message: 'Module marked as complete!', type: 'success' });
              }}
              sx={{
                backgroundColor: '#1976d2',
                color: 'white',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#1565c0',
                },
              }}
            >
              Mark as Complete
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  };

  // Render New Post Modal
  const renderNewPostModal = () => {
    if (!showNewPostModal) return null;

    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          p: 2,
        }}
      >
        <Paper
          sx={{
            background: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '600px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 3,
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
              New Forum Post
            </Typography>
            <Button
              onClick={() => {
                setShowNewPostModal(false);
                setPostTitle('');
                setPostContent('');
                setPostAnonymously(true);
              }}
              sx={{
                minWidth: 'auto',
                p: 1,
                color: '#666',
                '&:hover': {
                  backgroundColor: '#f3f4f6',
                },
              }}
            >
              <CloseIcon />
            </Button>
          </Box>

          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ mb: 1, fontWeight: 500, color: '#333' }}>
                Title <span style={{ color: '#dc3545' }}>*</span>
              </Typography>
              <TextField
                fullWidth
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Enter post title"
                required
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ mb: 1, fontWeight: 500, color: '#333' }}>
                Content <span style={{ color: '#dc3545' }}>*</span>
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Enter post content"
                required
              />
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={postAnonymously}
                  onChange={(e) => setPostAnonymously(e.target.checked)}
                />
              }
              label="Post anonymously"
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 2,
              p: 3,
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <Button
              variant="outlined"
              onClick={() => {
                setShowNewPostModal(false);
                setPostTitle('');
                setPostContent('');
                setPostAnonymously(true);
              }}
              sx={{
                textTransform: 'none',
                borderColor: '#d0d0d0',
                color: '#333',
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmitPost}
              sx={{
                backgroundColor: '#1976d2',
                color: 'white',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#1565c0',
                },
              }}
            >
              Post
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  };

  // Render Post View Modal
  const renderPostModal = () => {
    if (!showPostModal || !selectedPost) return null;

    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          p: 2,
        }}
      >
        <Paper
          sx={{
            background: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 3,
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
              Forum Discussion
            </Typography>
            <Button
              onClick={() => setShowPostModal(false)}
              sx={{
                minWidth: 'auto',
                p: 1,
                color: '#666',
                '&:hover': {
                  backgroundColor: '#f3f4f6',
                },
              }}
            >
              <CloseIcon />
            </Button>
          </Box>

          <Box sx={{ p: 3 }}>
            <Box
              sx={{
                p: 2,
                backgroundColor: '#e3f2fd',
                borderLeft: '4px solid #1976d2',
                borderRadius: '4px',
                mb: 3,
              }}
            >
              <Typography sx={{ color: '#333', fontSize: '14px' }}>
                This is a simulated community forum post. In a production environment, this would
                display the full discussion thread.
              </Typography>
            </Box>
            <Typography sx={{ color: '#666' }}>Post content and replies would be displayed here.</Typography>
          </Box>
        </Paper>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flexGrow: 1,
        p: { xs: 2, sm: 3 },
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        marginTop: '100px',
      }}
    >
      {/* Tabs Navigation Bar */}
      <Box
        sx={{
          display: 'flex',
          background: '#fffff',
          padding: '12px 20px',
          gap: '24px',
          borderBottom: '1px solid #bdbdbd',
        }}
      >
        <Typography
          onClick={() => setActiveTab('modules')}
          sx={{
            color: activeTab === 'modules' ? '#1976d2' : '#666',
            fontWeight: 500,
            cursor: 'pointer',
            borderBottom: activeTab === 'modules' ? '2px solid #1976d2' : 'none',
            paddingBottom: '4px',
            '&:hover': {
              color: '#1976d2',
            },
          }}
        >
          Learning Modules
        </Typography>
        <Typography
          onClick={() => setActiveTab('faqs')}
          sx={{
            color: activeTab === 'faqs' ? '#1976d2' : '#666',
            fontWeight: 500,
            cursor: 'pointer',
            borderBottom: activeTab === 'faqs' ? '2px solid #1976d2' : 'none',
            paddingBottom: '4px',
            '&:hover': {
              color: '#1976d2',
            },
          }}
        >
          FAQs
        </Typography>
        <Typography
          onClick={() => setActiveTab('forum')}
          sx={{
            color: activeTab === 'forum' ? '#1976d2' : '#666',
            fontWeight: 500,
            cursor: 'pointer',
            borderBottom: activeTab === 'forum' ? '2px solid #1976d2' : 'none',
            paddingBottom: '4px',
            '&:hover': {
              color: '#1976d2',
            },
          }}
        >
          Community Forum
        </Typography>
      </Box>

      {/* Tab Content */}
      <Box>
        {activeTab === 'modules' && renderModulesTab()}
        {activeTab === 'faqs' && renderFAQsTab()}
        {activeTab === 'forum' && renderForumTab()}
      </Box>

      {/* Modals */}
      {renderModuleModal()}
      {renderNewPostModal()}
      {renderPostModal()}

      {/* Toast Notification */}
      {toast && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            backgroundColor:
              toast.type === 'success'
                ? '#4caf50'
                : toast.type === 'error'
                ? '#f44336'
                : '#1976d2',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '4px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '300px',
            zIndex: 9999,
          }}
        >
          <Typography sx={{ fontSize: '14px' }}>{toast.message}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default Education;

