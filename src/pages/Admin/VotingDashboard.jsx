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
    <div className={`container mx-auto px-4 py-8 ${themeClasses.background}`}>
      <h1 className={`text-2xl font-bold mb-6 ${themeClasses.text}`}>
        <FaChartBar className="inline mr-2" />
        Feature Voting Dashboard
      </h1>
      
      {loading ? (
        <div className={`${themeClasses.card} p-8 text-center`}>
          <p>Loading voting data...</p>
        </div>
      ) : (
        <div className={`${themeClasses.card} p-6`}>
          <table className="w-full">
            <thead>
              <tr className={`border-b ${themeClasses.divider}`}>
                <th className="text-left py-3">Feature</th>
                <th className="text-right py-3">Vote Count</th>
              </tr>
            </thead>
            <tbody>
              {votingStats.map((item) => (
                <tr key={item.feature_id} className={`border-b ${themeClasses.divider}`}>
                  <td className="py-3">{item.feature_id.replace(/-/g, ' ')}</td>
                  <td className="py-3 text-right">
                    <span className={`inline-flex items-center ${themeClasses.text}`}>
                      {item.count} <FaThumbsUp className="ml-2" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VotingDashboard;