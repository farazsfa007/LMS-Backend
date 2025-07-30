export const calculateFine = (
  borrowDate,
  isReturned = false,
  returnDate = null
) => {
  const now = new Date();
  const endTime = isReturned ? returnDate : now;

  const borrowTime = new Date(borrowDate);
  const gracePeriodEnd = new Date(borrowTime.getTime() + 5 * 60 * 1000); // 5 min

  if (endTime <= gracePeriodEnd) return 0;

  const durationInMs = endTime - gracePeriodEnd;
  const hoursPassed = Math.floor(durationInMs / (1000 * 60 * 60)); 

  return hoursPassed * 10; // ₹10 per hour after 5 mins
};
