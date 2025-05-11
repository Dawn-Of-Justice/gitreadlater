import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabaseClient';
import { FaChartBar, FaThumbsUp } from 'react-icons/fa';

const VotingDashboard = () => {
  const { themeClasses, darkMode } = useTheme();
  const [votingStats, setVotingStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVotingStats();
  }, []);

  const fetchVotingStats = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_votes')
        .select('feature_id, count(*)')
        .group('feature_id')
        .order('count', { ascending: false });

      if (error) throw error;
      setVotingStats(data);
    } catch (error) {
      console.error('Error fetching voting stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${themeClasses.body} min-h-screen py-8`}>
      <div className="container mx-auto px-4">
        <h1 className={`text-2xl font-bold mb-6 flex items-center ${themeClasses.text}`}>
          <FaChartBar className={`mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          Feature Voting Dashboard
        </h1>
        
        {loading ? (
          <div className={`${themeClasses.card} p-8 text-center shadow-md rounded-lg`}>
            <p className={themeClasses.text}>Loading voting data...</p>
          </div>
        ) : votingStats.length === 0 ? (
          <div className={`${themeClasses.card} p-8 text-center shadow-md rounded-lg`}>
            <p className={themeClasses.text}>No votes have been cast yet.</p>
            <p className={`mt-2 ${themeClasses.textSecondary}`}>
              Votes will appear here once users start voting on roadmap features.
            </p>
          </div>
        ) : (
          <div className={`${themeClasses.card} p-6 shadow-md rounded-lg`}>
            <table className="w-full">
              <thead>
                <tr className={`border-b ${themeClasses.divider}`}>
                  <th className={`text-left py-3 ${themeClasses.text} font-bold`}>Feature</th>
                  <th className={`text-right py-3 ${themeClasses.text} font-bold`}>Vote Count</th>
                </tr>
              </thead>
              <tbody>
                {votingStats.map((item) => (
                  <tr key={item.feature_id} className={`border-b ${themeClasses.divider}`}>
                    <td className={`py-3 ${themeClasses.text}`}>
                      {item.feature_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </td>
                    <td className={`py-3 text-right ${themeClasses.text}`}>
                      <span className={`inline-flex items-center`}>
                        {item.count} <FaThumbsUp className="ml-2 text-blue-500" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingDashboard;