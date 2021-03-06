package airboat

import grails.plugin.spock.IntegrationSpec

class ChangesetControllerIntegrationSpec extends IntegrationSpec {

    def springSecurityService
    def scmAccessService
    def commentConverterService

    ChangesetController controller = new ChangesetController()

    def setup() {
        controller.scmAccessService = scmAccessService
        controller.commentConverterService = commentConverterService
    }

    def 'getLastChangesets should return JSON'() {
        given:
        Project project = Project.build()
        def changesets = (1..3).collect { Changeset.build(project: project) }

        when:
        controller.params.projectName = project.name
        controller.getLastChangesets()

        then:
        controller.response.getContentType().startsWith('application/json')
        responseChangesets.size() == changesets.size()
    }

    def 'getChangesetFiles should return file names from changeset'() {
        given:
        Project project = Project.build()
        ProjectFile projectFile = ProjectFile.build(name: 'kickass!', project: project)
        Changeset changeset = Changeset.build(project: project)
        ProjectFileInChangeset.build(changeset: changeset, projectFile: projectFile)

        when:
        List<Map> projectFilesProperties = controller.getChangesetFiles(changeset)

        then:
        projectFilesProperties.size() == 1
        projectFilesProperties.first().name == projectFile.name
    }

    def 'should return few next changesets older than one with given revision id as JSON'() {
        given:
        def latestChangeset = buildChangelogEntry(3)
        buildChangelogEntry(2)
        buildChangelogEntry(1)

        expect:
        controller.commentConverterService != null

        when:
        controller.getNextFewChangesetsOlderThan(latestChangeset.id)

        then:
        responseChangesets*.identifier == ['2', '1']
    }

    def 'should return next few changesets older than given, within given project as JSON'() {
        given:
        Project project = Project.build()
        def latestChangeset = buildChangelogEntry(3, project)
        buildChangelogEntry(2, project)
        buildChangelogEntry(1, Project.build())
        buildChangelogEntry(0, project)

        expect:
        controller.commentConverterService != null

        when:
        controller.getNextFewChangesetsOlderThanFromSameProject(latestChangeset.id)

        then:
        responseChangesets*.identifier == ['2', '0']
    }

    def 'should return importing=true when state of the project is less then fullyImported'() {
        given:
        Project project = Project.build(name: 'project', state: state)

        when:
        def projectsInImport = controller.projectsInImport()

        then:
        projectsInImport.contains(project.name) == importing

        where:
        state                                           | importing
        Project.ProjectState.notImported                | true
        Project.ProjectState.triedToBeInitiallyImported | true
        Project.ProjectState.initiallyImported          | true
        Project.ProjectState.fullyImported              | false
    }

    private Changeset buildChangelogEntry(int positionCountingFromOldest, Project project = Project.build()) {
        Changeset.build(
                project: project,
                identifier: "$positionCountingFromOldest",
                date: minutesSinceEpoch(positionCountingFromOldest)
        )
    }

    //default time format is accurate to minutes, so for dates to be distinguishable in error logs, use this:
    private Date minutesSinceEpoch(int minutes) {
        new Date(minutes * 1000 * 60)
    }

    private Collection<?> getResponseChangesets() {
        controller.response.json['changesets'].collect {day, changesetsForDay -> changesetsForDay}.flatten()
    }
}
