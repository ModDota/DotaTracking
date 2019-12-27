export async function gitAddA(git, repo) {
    return git.statusMatrix(repo).then((status) => Promise.all(
        status.map(([filepath, , worktreeStatus]) =>
            // isomorphic-git may report a changed file as unmodified, so always add if not removing
            worktreeStatus ? git.add({ ...repo, filepath }) : git.remove({ ...repo, filepath })
        )
    ));
}

export async function getFileStateChanges (git, commitHash1, commitHash2, dir) {
    return git.walkBeta1({
      trees: [
        git.TREE({ dir: dir, ref: commitHash1 }),
        git.TREE({ dir: dir, ref: commitHash2 })
      ],
      map: async function ([A, B]) {
        // ignore directories
        if (A.fullpath === '.') {
          return
        }
        await A.populateStat()
        if (A.type === 'tree') {
          return
        }
        await B.populateStat()
        if (B.type === 'tree') {
          return
        }
  
        // generate ids
        await A.populateHash()
        await B.populateHash()
  
        // determine modification type
        let type = 'equal'
        if (A.oid !== B.oid) {
          type = 'modify'
        }
        if (A.oid === undefined) {
          type = 'add'
        }
        if (B.oid === undefined) {
          type = 'remove'
        }
        if (A.oid === undefined && B.oid === undefined) {
          console.log('Something weird happened:')
          console.log(A)
          console.log(B)
        }
  
        return {
          path: `/${A.fullpath}`,
          type: type
        }
      }
    })
  }