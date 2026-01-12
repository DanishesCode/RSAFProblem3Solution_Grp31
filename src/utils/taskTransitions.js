export function isValidTransition(from, to) {
  const rules = {
    toDo: ['progress', 'cancel'],
    progress: ['toDo', 'review', 'cancel'],
    review: ['done', 'progress', 'cancel'],
    done: ['cancel'],
    cancel: ['toDo']
  };
  return rules[from]?.includes(to) || false;
}


